from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from sqlmodel import SQLModel, Session
from sqlalchemy import text
import logging
import signal
from typing import cast, Any, Callable

from .database import engine
from .middleware import LoggingMiddleware, TenantMiddleware
from .exception_handlers import validation_exception_handler, general_exception_handler
from .utils import CustomJSONResponse
from .api import router

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI(title="IPAM API")

# Add logging middleware
app.add_middleware(LoggingMiddleware)

# Add tenant middleware
app.add_middleware(TenantMiddleware)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # Allow both localhost and 127.0.0.1
    allow_credentials=True,  # Allow credentials
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # Specify allowed methods
    allow_headers=["*"],  # Allows all headers
    expose_headers=["Content-Type", "X-Requested-With", "Accept", "Authorization"],  # Expose specific headers
)

# Use our custom response class as the default
app.router.default_response_class = CustomJSONResponse

# Add exception handlers
# Cast the exception handlers to Any to satisfy the type checker
app.add_exception_handler(RequestValidationError, cast(Any, validation_exception_handler))
app.add_exception_handler(Exception, cast(Any, general_exception_handler))

# Include the API router
app.include_router(router)

# Set up Row-Level Security (RLS) for PostgreSQL
def setup_row_level_security():
    """
    Set up PostgreSQL Row-Level Security (RLS) for tenant isolation.
    This function creates the necessary RLS policies and functions.
    """
    logger.info("Setting up Row-Level Security for PostgreSQL...")
    with Session(engine) as session:
        # Create app schema if it doesn't exist
        session.execute(text("CREATE SCHEMA IF NOT EXISTS app"))
        
        # Create function to get current tenant ID
        session.execute(text("""
        CREATE OR REPLACE FUNCTION app.get_current_tenant_id()
        RETURNS UUID AS $$
        BEGIN
            RETURN current_setting('app.current_tenant_id', TRUE)::UUID;
        EXCEPTION
            WHEN OTHERS THEN
                RETURN NULL;
        END;
        $$ LANGUAGE plpgsql;
        """))
        
        # Enable RLS on tables that need tenant isolation
        tables_with_tenant_id = [
            "prefixes", "ip_ranges", "ip_addresses", "sites", "vlans",
            "vrfs", "aggregates", "interfaces"
        ]
        
        for table in tables_with_tenant_id:
            # Check if table exists before enabling RLS
            result = session.execute(text(
                f"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'ipam' AND table_name = '{table}')"
            ))
            table_exists = result.scalar()
            
            if table_exists:
                # Enable RLS on table
                session.execute(text(f"ALTER TABLE ipam.{table} ENABLE ROW LEVEL SECURITY"))
                
                # Check if policy already exists
                policy_name = f"tenant_isolation_{table}_policy"
                result = session.execute(text(
                    f"SELECT EXISTS (SELECT FROM pg_policies WHERE schemaname = 'ipam' AND tablename = '{table}' AND policyname = '{policy_name}')"
                ))
                policy_exists = result.scalar()
                
                if not policy_exists:
                    # Create policy for data isolation
                    session.execute(text(f"""
                    CREATE POLICY {policy_name} ON ipam.{table}
                    USING (
                        tenant_id IS NULL OR 
                        tenant_id = app.get_current_tenant_id() OR
                        app.get_current_tenant_id() IS NULL
                    )
                    """))
                    logger.info(f"RLS policy created for ipam.{table}")
                else:
                    logger.info(f"RLS policy already exists for ipam.{table}")
                
                logger.info(f"RLS enabled on ipam.{table}")
            else:
                logger.warning(f"Table ipam.{table} does not exist, skipping RLS setup")
        
        # Commit all changes
        session.commit()
        
        logger.info("Row-Level Security setup complete")

# Create tables and RLS policies
@app.on_event("startup")
async def startup_event():
    # Create tables (existing behavior)
    logger.info("Creating database tables...")
    SQLModel.metadata.create_all(engine)
    logger.info("Database tables created")
    
    # Set up Row-Level Security
    setup_row_level_security()
    
    logger.info("Startup complete - server ready")

# Store the original signal handlers
original_sigint_handler = signal.getsignal(signal.SIGINT)
original_sigterm_handler = signal.getsignal(signal.SIGTERM)

# Flag to track if shutdown has been initiated
shutdown_initiated = False

# Signal handler for graceful shutdown
def signal_handler(sig, frame):
    global shutdown_initiated
    
    # Prevent multiple shutdown attempts
    if shutdown_initiated:
        return
    
    shutdown_initiated = True
    
    logger.info("Shutting down backend server...")
    
    # Call the original signal handler to let the server shut down normally
    if sig == signal.SIGINT and original_sigint_handler:
        if callable(original_sigint_handler):
            original_sigint_handler(sig, frame)
    elif sig == signal.SIGTERM and original_sigterm_handler:
        if callable(original_sigterm_handler):
            original_sigterm_handler(sig, frame)

# Register signal handlers
signal.signal(signal.SIGINT, signal_handler)  # Ctrl+C
signal.signal(signal.SIGTERM, signal_handler)  # Termination signal

# Add shutdown event handler to FastAPI
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("FastAPI shutdown event triggered")

# Add a simple test endpoint at the root
@app.get("/")
async def root():
    return {"message": "Welcome to the IPAM API"}

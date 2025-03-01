from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from sqlmodel import SQLModel
import logging

from .database import engine
from .middleware import LoggingMiddleware
from .exception_handlers import validation_exception_handler, general_exception_handler
from .utils import CustomJSONResponse
from .api import router

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI(title="IPAM API")

# Add logging middleware
app.add_middleware(LoggingMiddleware)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Specifically allow the frontend origin
    allow_credentials=True,  # Allow credentials
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # Specify allowed methods
    allow_headers=["*"],  # Allows all headers
    expose_headers=["Content-Type", "X-Requested-With", "Accept", "Authorization"],  # Expose specific headers
)

# Use our custom response class as the default
app.router.default_response_class = CustomJSONResponse

# Add exception handlers
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Include the API router
app.include_router(router)

# Create tables
SQLModel.metadata.create_all(engine)

# Add a simple test endpoint at the root
@app.get("/")
async def root():
    return {"message": "Welcome to the IPAM API"}

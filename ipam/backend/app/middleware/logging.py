from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import logging
import time

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Create a middleware class to log requests and responses
class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Log request
        request_id = str(time.time())
        logger.debug(f"Request {request_id}: {request.method} {request.url}")
        
        # Try to log request body for POST/PUT requests
        if request.method in ["POST", "PUT"]:
            try:
                # We can't read the body directly as it will consume the stream
                # Just log that there's a body
                logger.debug(f"Request {request_id} has a body (not logged to avoid consuming stream)")
            except Exception as e:
                logger.error(f"Error with request body: {str(e)}")
        
        # Log query params for all requests
        logger.debug(f"Request {request_id} query params: {request.query_params}")
        
        # Process the request
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        
        # Log response
        logger.debug(f"Response {request_id}: status={response.status_code}, time={process_time:.4f}s")
        
        return response

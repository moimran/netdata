import re
import unicodedata
from typing import Optional

def slugify(text: str, max_length: Optional[int] = None) -> str:
    """
    Convert a string to a URL-friendly slug.
    
    Args:
        text: The string to convert
        max_length: Optional maximum length for the slug
        
    Returns:
        A URL-friendly slug
    """
    # Normalize unicode characters
    text = unicodedata.normalize('NFKD', text)
    
    # Remove non-ASCII characters
    text = re.sub(r'[^\x00-\x7F]+', '', text)
    
    # Convert to lowercase
    text = text.lower()
    
    # Replace spaces with hyphens
    text = re.sub(r'\s+', '-', text)
    
    # Remove all other non-word characters
    text = re.sub(r'[^\w\-]', '', text)
    
    # Replace multiple hyphens with a single hyphen
    text = re.sub(r'\-+', '-', text)
    
    # Remove leading and trailing hyphens
    text = text.strip('-')
    
    # Truncate to max_length if specified
    if max_length is not None and len(text) > max_length:
        text = text[:max_length].rstrip('-')
    
    # If the slug is empty, use a default value
    if not text:
        text = 'unnamed'
    
    return text

"""
WebSSH-RS Python bindings for SSH functionality.
"""

try:
    from .webssh_rs import SSHSession, SSHError
    __all__ = ['SSHSession', 'SSHError']
except ImportError:
    import warnings
    warnings.warn(
        "Failed to import Rust extension module. "
        "WebSSH-RS will not be available. "
        "Please ensure the module is properly installed."
    )
    __all__ = []

__version__ = '0.1.0'
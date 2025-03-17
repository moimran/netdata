mod ssh;
mod python;

use pyo3::prelude::*;

/// WebSSH-RS Python module
#[pymodule]
fn webssh_rs(_py: Python, m: &PyModule) -> PyResult<()> {
    // Register the SSHSession class
    m.add_class::<python::SSHSession>()?;
    
    // Register custom exceptions
    m.add("SSHError", _py.get_type::<python::SSHError>())?;
    
    Ok(())
}
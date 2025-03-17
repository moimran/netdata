from setuptools import setup
from setuptools_rust import Binding, RustExtension

setup(
    name="webssh_rs",
    version="0.1.0",
    description="Python bindings for SSH functionality",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    author="IPAM Team",
    author_email="example@example.com",
    url="https://github.com/example/webssh-rs",
    rust_extensions=[
        RustExtension(
            "webssh_rs.webssh_rs",
            binding=Binding.PyO3,
            debug=False
        )
    ],
    packages=["webssh_rs"],
    zip_safe=False,
    python_requires=">=3.8",
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Rust",
        "Topic :: Software Development :: Libraries",
        "Topic :: System :: Networking",
    ],
)
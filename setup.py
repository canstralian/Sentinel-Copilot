"""
Setup script for Sentinel-Copilot
"""

from setuptools import setup, find_packages
from pathlib import Path

# Read the contents of README file
this_directory = Path(__file__).parent
long_description = (this_directory / "README.md").read_text(encoding='utf-8')

setup(
    name="sentinel-copilot",
    version="2.0.0",
    author="Sentinel Team",
    author_email="team@sentinel-copilot.com",
    description="A system monitoring and alerting service with clean code architecture",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/canstralian/Sentinel-Copilot",
    packages=find_packages(exclude=["tests*", "docs*"]),
    py_modules=["sentinel_monitor"],
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Intended Audience :: System Administrators",
        "Topic :: System :: Monitoring",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
    python_requires=">=3.8",
    install_requires=[
        # No external dependencies - all standard library
    ],
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-cov>=4.0.0",
            "black>=23.0.0",
            "flake8>=6.0.0",
            "mypy>=1.0.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "sentinel-monitor=sentinel_monitor:main",
        ],
    },
    include_package_data=True,
    package_data={
        "": ["config_default.json"],
    },
    zip_safe=False,
)

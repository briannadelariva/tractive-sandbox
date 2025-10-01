#!/usr/bin/env python3
from setuptools import setup, find_packages

setup(
    name="tractive-cli",
    version="1.0.0",
    description="Minimal command-line tool for Tractive pet tracker data",
    packages=find_packages(),
    install_requires=[
        "requests>=2.31.0",
    ],
    entry_points={
        "console_scripts": [
            "tractive-cli=tractive_cli.main:main",
        ],
    },
    python_requires=">=3.6",
)
"""Pytest configuration and fixtures"""
import sys
from pathlib import Path

# Add src directory to path so we can import app
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

import pytest
from fastapi.testclient import TestClient
from app import app, activities


@pytest.fixture
def client():
    """Create a test client for the FastAPI app"""
    return TestClient(app)


@pytest.fixture
def reset_activities():
    """Reset activities to initial state before and after each test"""
    # Store initial state
    initial_state = {
        activity: {
            **data,
            "participants": data["participants"].copy()
        }
        for activity, data in activities.items()
    }
    
    yield
    
    # Reset to initial state after test
    for activity, data in activities.items():
        data["participants"] = initial_state[activity]["participants"].copy()

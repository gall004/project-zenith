import os

def test_backend_directory_structure():
    """
    US-02: Strict Directory Structure
    Verifies that the backend project matches the exact governance layout.
    """
    # Arrange
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    required_dirs = [
        "app/api/v1",
        "app/services",
        "app/pipelines",
        "app/core",
        "app/models"
    ]

    # Act & Assert
    for dir_path in required_dirs:
        full_path = os.path.join(base_dir, dir_path)
        assert os.path.isdir(full_path), f"Required directory {dir_path} is missing."

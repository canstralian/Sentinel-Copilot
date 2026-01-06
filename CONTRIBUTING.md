# Contributing to Sentinel-Copilot

Thank you for your interest in contributing to Sentinel-Copilot! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Code Quality Standards](#code-quality-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please be respectful and constructive in all interactions.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/Sentinel-Copilot.git
   cd Sentinel-Copilot
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/canstralian/Sentinel-Copilot.git
   ```

## Development Setup

1. **Create a virtual environment** (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install development dependencies**:
   ```bash
   pip install -r requirements-dev.txt
   ```

3. **Install package in editable mode**:
   ```bash
   pip install -e .
   ```

## Making Changes

### Branch Naming Convention

- Feature branches: `feature/description`
- Bug fixes: `fix/description`
- Documentation: `docs/description`
- Performance: `perf/description`

Example:
```bash
git checkout -b feature/add-email-alerts
```

### Commit Message Guidelines

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Examples:
```
feat: add async I/O support for log channel
fix: resolve throttling dict lookup issue
docs: update README with configuration examples
perf: optimize throttling with O(1) dict lookup
```

## Code Quality Standards

### Code Style

We follow PEP 8 with some modifications:
- **Line length**: 100 characters (not 80)
- **Use Black** for automatic formatting
- **Use type hints** where possible
- **Write docstrings** for all public classes and functions

Run Black before committing:
```bash
black sentinel_monitor.py
```

### Linting

Run flake8 to check for issues:
```bash
flake8 sentinel_monitor.py --max-line-length=100 --extend-ignore=E203,W503
```

### Type Checking

Run mypy for type checking:
```bash
mypy sentinel_monitor.py --ignore-missing-imports
```

### Architecture Principles

This project follows these clean code principles:

1. **Single Responsibility Principle**: Each class should have one clear purpose
2. **Separation of Concerns**: Keep validation, calculation, formatting, and delivery separate
3. **Dependency Injection**: Pass dependencies explicitly rather than hard-coding them
4. **Configuration over Hard-coding**: Use config.json for configurable values
5. **Specific Exception Handling**: Catch specific exceptions, not broad `Exception`

## Testing

### Running Tests

Run all tests:
```bash
pytest
```

Run with coverage:
```bash
pytest --cov=sentinel_monitor --cov-report=html
```

View coverage report:
```bash
open htmlcov/index.html  # On macOS
# or
xdg-open htmlcov/index.html  # On Linux
```

### Writing Tests

- Place tests in `test_monitor.py` or create new test files with `test_` prefix
- Aim for >80% code coverage
- Test both happy paths and error cases
- Use descriptive test names: `test_throttling_blocks_duplicate_alerts`

Example test:
```python
def test_config_loads_from_file():
    """Config should load values from config.json"""
    config = Config('config.json')
    assert config.throttle_minutes == 15
```

## Submitting Changes

### Before Submitting

1. **Ensure all tests pass**:
   ```bash
   pytest
   ```

2. **Run code quality checks**:
   ```bash
   black --check sentinel_monitor.py
   flake8 sentinel_monitor.py --max-line-length=100
   ```

3. **Update documentation** if needed

4. **Add tests** for new functionality

### Pull Request Process

1. **Update your branch** with latest upstream:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Push to your fork**:
   ```bash
   git push origin feature/your-feature
   ```

3. **Create a Pull Request** on GitHub with:
   - Clear description of changes
   - Reference to any related issues
   - Screenshots/examples if applicable

4. **Respond to feedback** from reviewers

5. **Squash commits** if requested before merging

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] All existing tests pass
- [ ] Added new tests for new functionality
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings introduced
```

## Performance Benchmarks

Run benchmarks to verify performance:
```bash
python benchmark_throttling.py
```

## Questions or Issues?

- Open an issue on GitHub for bugs or feature requests
- Check existing issues before creating new ones
- Provide detailed information including:
  - Python version
  - Operating system
  - Steps to reproduce
  - Expected vs actual behavior

## Recognition

Contributors will be recognized in:
- GitHub contributors page
- Release notes for significant contributions

Thank you for contributing to Sentinel-Copilot! 🚀

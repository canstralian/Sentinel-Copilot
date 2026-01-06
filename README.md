# Sentinel-Copilot

[![CI/CD Pipeline](https://github.com/canstralian/Sentinel-Copilot/workflows/CI%2FCD%20Pipeline/badge.svg)](https://github.com/canstralian/Sentinel-Copilot/actions)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)

A production-ready system monitoring and alerting service demonstrating clean code architecture, SOLID principles, and modern Python best practices.

## 🚀 Features

- **Clean Architecture**: Refactored from monolithic code to modular, maintainable components
- **O(1) Performance**: Dict-based throttling for constant-time lookups
- **Async I/O**: Non-blocking log file writes with background worker threads
- **Configuration Management**: JSON-based configuration with sensible defaults
- **Specific Exception Handling**: Granular error handling for better debugging
- **Full Test Coverage**: 16+ unit tests with pytest and coverage reporting
- **Type Safety**: Comprehensive type hints with mypy support
- **CI/CD Ready**: GitHub Actions workflow with automated testing and linting
- **Zero Dependencies**: Pure Python standard library implementation

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [Performance](#performance)
- [Development](#development)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## 🔧 Installation

### From Source

```bash
# Clone the repository
git clone https://github.com/canstralian/Sentinel-Copilot.git
cd Sentinel-Copilot

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install in development mode
pip install -e .

# Or install development dependencies
pip install -r requirements-dev.txt
```

### Using pip (when published)

```bash
pip install sentinel-copilot
```

## 🎯 Quick Start

### Basic Usage

```python
from sentinel_monitor import SystemMonitor
import time

# Create monitor with default configuration
monitor = SystemMonitor()

# Define metrics
metrics = {
    'cpu': 85,
    'memory': 92,
    'disk': 75,
    'network': 45,
    'timestamp': time.time()
}

# Send alerts
result = monitor.process_metrics_and_send_alerts(
    metrics,
    alert_channels=['console', 'log'],
    enable_throttling=True
)

print(f"Alerts sent: {result['alerts_sent']}")
```

### With Custom Configuration

```python
from sentinel_monitor import SystemMonitor, Config

# Load custom configuration
config = Config('my_config.json')

# Create monitor with custom config
monitor = SystemMonitor(config=config)

# Add custom alert handler
def slack_handler(alert):
    print(f"Sending to Slack: {alert.message}")

monitor.add_custom_channel('slack', slack_handler)

# Process metrics with custom channel
result = monitor.process_metrics_and_send_alerts(
    metrics,
    alert_channels=['console', 'log', 'slack']
)
```

## ⚙️ Configuration

### Configuration File (config.json)

```json
{
  "thresholds": {
    "cpu": 80,
    "memory": 85,
    "disk": 90,
    "network": 75
  },
  "severity": {
    "critical_ratio": 1.5,
    "high_ratio": 1.2,
    "medium_ratio": 1.0
  },
  "throttling": {
    "enabled": true,
    "throttle_minutes": 15
  },
  "channels": {
    "log_file": "alerts.log",
    "default_channels": ["console", "log"]
  },
  "async_io": {
    "enabled": true,
    "queue_size": 1000
  }
}
```

### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `thresholds.*` | 75-90 | Alert thresholds for each metric type |
| `severity.critical_ratio` | 1.5 | Multiplier for critical severity (1.5x threshold) |
| `severity.high_ratio` | 1.2 | Multiplier for high severity (1.2x threshold) |
| `throttling.throttle_minutes` | 15 | Minutes to throttle duplicate alerts |
| `channels.log_file` | alerts.log | Path to log file for file channel |
| `async_io.enabled` | true | Enable async I/O for log writing |
| `async_io.queue_size` | 1000 | Max size of async write queue |

## 🏗️ Architecture

### Component Overview

```
SystemMonitor (Orchestrator)
    ├── Config (Configuration Management)
    ├── MetricsValidator (Input Validation)
    ├── SeverityCalculator (Severity Computation)
    ├── AlertThrottler (Duplicate Prevention)
    ├── AlertFormatter (Message Formatting)
    └── ChannelManager (Alert Delivery)
        ├── ConsoleChannel
        ├── LogFileChannel / AsyncLogFileChannel
        └── CustomHandlerChannel
```

### Design Patterns

- **Single Responsibility Principle**: Each class has one clear purpose
- **Strategy Pattern**: `AlertChannel` allows pluggable delivery mechanisms
- **Dependency Injection**: Components receive dependencies explicitly
- **Factory Pattern**: `AlertFormatter.create_alert()` constructs alerts
- **Observer Pattern**: Custom handlers can be registered dynamically

### Key Classes

| Class | Purpose | Lines |
|-------|---------|-------|
| `Config` | Load and manage configuration | ~90 |
| `MetricsValidator` | Validate input metrics | ~25 |
| `SeverityCalculator` | Calculate alert severity | ~45 |
| `AlertThrottler` | Prevent alert spam with O(1) lookup | ~35 |
| `AlertFormatter` | Format alert messages | ~50 |
| `AlertChannel` | Base class for delivery channels | ~10 |
| `ConsoleChannel` | Console output delivery | ~8 |
| `LogFileChannel` | Synchronous file logging | ~20 |
| `AsyncLogFileChannel` | Async file logging with queue | ~50 |
| `ChannelManager` | Manage multiple channels | ~30 |

## ⚡ Performance

### Throttling Optimization

**Before (O(n) Linear Search)**:
```python
# O(n) - searches through entire history list
for hist in self.alert_history:
    if hist['metric_type'] == metric_type:
        # check time...
```

**After (O(1) Dict Lookup)**:
```python
# O(1) - direct dictionary access
if metric_type in self.alert_history:
    last_alert = self.alert_history[metric_type]
    # check time...
```

### Benchmark Results

Run benchmarks:
```bash
python benchmark_throttling.py
```

Example output:
```
Throttling Lookup Performance (O(1) dict-based)
    10 metrics: 0.0245 ms per 100 lookups
   100 metrics: 0.0251 ms per 100 lookups
  1000 metrics: 0.0248 ms per 100 lookups
 10000 metrics: 0.0253 ms per 100 lookups

✓ O(1) dict-based lookup: Constant time complexity
✓ Scales efficiently with large numbers of metrics
```

### Async I/O Benefits

- **Non-blocking writes**: Main processing continues while logs are written
- **Batched I/O**: Reduces system call overhead
- **Graceful shutdown**: Ensures all queued messages are written
- **Configurable queue**: Prevents memory exhaustion

## 🔬 Development

### Project Structure

```
Sentinel-Copilot/
├── sentinel_monitor.py          # Main monitoring module
├── sentinel_monitor_original.py # Original (archived)
├── test_monitor.py              # Unit tests
├── benchmark_throttling.py      # Performance benchmarks
├── config.json                  # User configuration
├── config_default.json          # Default configuration
├── setup.py                     # Package setup
├── pyproject.toml              # Modern Python packaging
├── requirements.txt            # Runtime dependencies (empty)
├── requirements-dev.txt        # Development dependencies
├── .github/workflows/ci.yml    # CI/CD pipeline
├── CONTRIBUTING.md             # Contribution guidelines
├── LICENSE                     # MIT license
└── README.md                   # This file
```

### Code Quality Tools

```bash
# Format code with Black
black sentinel_monitor.py

# Lint with Flake8
flake8 sentinel_monitor.py --max-line-length=100

# Type check with MyPy
mypy sentinel_monitor.py --ignore-missing-imports
```

## 🧪 Testing

### Run Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=sentinel_monitor --cov-report=html

# View coverage report
open htmlcov/index.html
```

### Test Coverage

- **16+ unit tests** covering all components
- **Behavior equivalence tests** ensure refactoring maintains functionality
- **Edge case testing** for throttling, validation, and error handling
- **>90% code coverage** target

### Test Categories

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Verify components work together
3. **Behavior Tests**: Ensure refactored code matches original behavior
4. **Performance Tests**: Benchmark throttling and I/O performance

## 📊 Refactoring Metrics

### Code Quality Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Lines in main function** | 117 | ~60 | 49% reduction |
| **Max nesting depth** | 5 | 2 | 60% reduction |
| **Parameters** | 7 | 4 | 43% reduction |
| **Responsibilities** | 8 | 1 | Single responsibility |
| **Cyclomatic complexity** | 20+ | ~5 | 75% reduction |
| **Testable components** | 1 | 9 | 9x more testable |
| **Exception specificity** | Generic | Specific | Better debugging |
| **Performance** | O(n) | O(1) | Constant time |

### Key Achievements

✅ **Eliminated code duplication** - Archived original version
✅ **Optimized performance** - O(1) throttling lookup
✅ **Added async I/O** - Non-blocking log writes
✅ **Configuration management** - JSON-based config
✅ **Specific exceptions** - IOError, OSError, PermissionError
✅ **Full packaging** - setup.py, pyproject.toml
✅ **CI/CD pipeline** - GitHub Actions with tests, linting, coverage
✅ **Documentation** - README, CONTRIBUTING, docstrings
✅ **Performance benchmarks** - Quantified improvements

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Quick Contribution Guide

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `pytest`
5. Run linters: `black . && flake8 .`
6. Commit: `git commit -m 'feat: add amazing feature'`
7. Push: `git push origin feature/amazing-feature`
8. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Clean code principles from Robert C. Martin's "Clean Code"
- SOLID principles for object-oriented design
- Python community for excellent testing and tooling ecosystem

## 📚 Additional Resources

- **[REFACTORING_ANALYSIS.md](REFACTORING_ANALYSIS.md)**: Detailed refactoring breakdown
- **[CONTRIBUTING.md](CONTRIBUTING.md)**: Development guidelines
- **CI/CD Pipeline**: `.github/workflows/ci.yml`

## 🔗 Links

- **Repository**: https://github.com/canstralian/Sentinel-Copilot
- **Issues**: https://github.com/canstralian/Sentinel-Copilot/issues
- **Discussions**: https://github.com/canstralian/Sentinel-Copilot/discussions

---

**Made with ❤️ by the Sentinel Team**

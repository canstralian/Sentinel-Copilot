"""
Sentinel-Copilot: A system monitoring and alerting service (REFACTORED)

This version demonstrates clean code principles:
- Single Responsibility Principle
- Clear separation of concerns
- Improved testability
- Better readability
"""

import json
import time
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum


class Severity(Enum):
    """Alert severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class Alert:
    """Represents a system alert"""
    message: str
    severity: Severity
    metric_type: str
    value: float
    threshold: float
    timestamp: float


@dataclass
class ProcessingResult:
    """Result of metrics processing"""
    alerts_sent: int = 0
    errors: List[str] = None
    processed_metrics: List[str] = None
    aggregation: Dict[str, Any] = None

    def __post_init__(self):
        if self.errors is None:
            self.errors = []
        if self.processed_metrics is None:
            self.processed_metrics = []


class MetricsValidator:
    """Validates incoming metrics data"""

    REQUIRED_KEYS = ['cpu', 'memory', 'disk', 'network', 'timestamp']

    @staticmethod
    def validate(metrics: Dict[str, Any]) -> List[str]:
        """
        Validate metrics dictionary.

        Returns:
            List of error messages (empty if valid)
        """
        errors = []

        if not metrics or not isinstance(metrics, dict):
            errors.append('Invalid metrics format')
            return errors

        for key in MetricsValidator.REQUIRED_KEYS:
            if key not in metrics:
                errors.append(f'Missing required key: {key}')

        return errors


class SeverityCalculator:
    """Calculates alert severity based on threshold exceedance"""

    @staticmethod
    def calculate(
        value: float,
        threshold: float,
        custom_severity: Optional[str] = None
    ) -> Severity:
        """
        Calculate severity level based on how much the value exceeds threshold.

        Args:
            value: Current metric value
            threshold: Threshold value
            custom_severity: Optional custom severity override

        Returns:
            Severity enum value
        """
        if custom_severity:
            return Severity(custom_severity)

        excess_ratio = value / threshold

        if excess_ratio > 1.5:
            return Severity.CRITICAL
        elif excess_ratio > 1.2:
            return Severity.HIGH
        elif excess_ratio > 1.0:
            return Severity.MEDIUM
        else:
            return Severity.LOW


class AlertThrottler:
    """Manages alert throttling to prevent spam"""

    def __init__(self, throttle_minutes: int = 15):
        self.throttle_minutes = throttle_minutes
        self.alert_history: List[Dict[str, Any]] = []

    def should_send_alert(self, metric_type: str) -> bool:
        """
        Check if an alert should be sent based on throttling rules.

        Args:
            metric_type: Type of metric being alerted on

        Returns:
            True if alert should be sent, False if throttled
        """
        current_time = time.time()

        for historical_alert in self.alert_history:
            if historical_alert['metric_type'] == metric_type:
                time_elapsed_minutes = (current_time - historical_alert['timestamp']) / 60
                if time_elapsed_minutes < self.throttle_minutes:
                    return False

        return True

    def record_alert(self, metric_type: str, severity: Severity, value: float):
        """Record that an alert was sent"""
        self.alert_history.append({
            'metric_type': metric_type,
            'timestamp': time.time(),
            'severity': severity.value,
            'value': value
        })


class AlertFormatter:
    """Formats alert messages"""

    @staticmethod
    def format_message(
        metric_type: str,
        value: float,
        threshold: float,
        severity: Severity,
        timestamp: float
    ) -> str:
        """
        Create a formatted alert message.

        Args:
            metric_type: Type of metric
            value: Current value
            threshold: Threshold value
            severity: Alert severity
            timestamp: Unix timestamp

        Returns:
            Formatted alert message string
        """
        formatted_time = datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d %H:%M:%S')
        message = (
            f"[{severity.value.upper()}] {metric_type.upper()} alert: "
            f"{value}% (threshold: {threshold}%) at {formatted_time}"
        )
        return message

    @staticmethod
    def create_alert(
        metric_type: str,
        value: float,
        threshold: float,
        severity: Severity,
        timestamp: float
    ) -> Alert:
        """Create an Alert object with formatted message"""
        message = AlertFormatter.format_message(
            metric_type, value, threshold, severity, timestamp
        )

        return Alert(
            message=message,
            severity=severity,
            metric_type=metric_type,
            value=value,
            threshold=threshold,
            timestamp=timestamp
        )


class AlertChannel:
    """Base class for alert delivery channels"""

    def send(self, alert: Alert) -> Optional[str]:
        """
        Send alert through this channel.

        Returns:
            Error message if failed, None if successful
        """
        raise NotImplementedError


class ConsoleChannel(AlertChannel):
    """Sends alerts to console"""

    def send(self, alert: Alert) -> Optional[str]:
        print(alert.message)
        return None


class LogFileChannel(AlertChannel):
    """Sends alerts to a log file"""

    def __init__(self, log_file: str = 'alerts.log'):
        self.log_file = log_file

    def send(self, alert: Alert) -> Optional[str]:
        try:
            with open(self.log_file, 'a') as f:
                f.write(f"{alert.message}\n")
            return None
        except Exception as e:
            return f"Failed to write to log: {str(e)}"


class CustomHandlerChannel(AlertChannel):
    """Sends alerts using a custom handler function"""

    def __init__(self, name: str, handler_func):
        self.name = name
        self.handler_func = handler_func

    def send(self, alert: Alert) -> Optional[str]:
        try:
            self.handler_func(alert)
            return None
        except Exception as e:
            return f"Custom handler '{self.name}' failed: {str(e)}"


class ChannelManager:
    """Manages alert delivery across multiple channels"""

    def __init__(self):
        self.channels: Dict[str, AlertChannel] = {
            'console': ConsoleChannel(),
            'log': LogFileChannel()
        }

    def add_custom_channel(self, name: str, handler):
        """Add a custom alert channel"""
        self.channels[name] = CustomHandlerChannel(name, handler)

    def send_alert(self, alert: Alert, channel_names: List[str]) -> List[str]:
        """
        Send alert to specified channels.

        Returns:
            List of error messages (empty if all successful)
        """
        errors = []

        for channel_name in channel_names:
            if channel_name not in self.channels:
                errors.append(f"Unknown channel: {channel_name}")
                continue

            error = self.channels[channel_name].send(alert)
            if error:
                errors.append(error)

        return errors


class StatisticsAggregator:
    """Aggregates statistics about alerts"""

    @staticmethod
    def aggregate(alerts: List[Alert], throttle_minutes: int) -> Dict[str, Any]:
        """
        Aggregate statistics from a list of alerts.

        Args:
            alerts: List of Alert objects
            throttle_minutes: Throttling window for context

        Returns:
            Dictionary containing aggregated statistics
        """
        if not alerts:
            return {}

        severity_counts = {}
        for alert in alerts:
            severity = alert.severity.value
            severity_counts[severity] = severity_counts.get(severity, 0) + 1

        return {
            'total_alerts': len(alerts),
            'by_severity': severity_counts,
            'time_window': f"{throttle_minutes} minutes"
        }


class SystemMonitor:
    """
    Main system monitoring class (REFACTORED).

    This version breaks down complexity into focused, testable components.
    """

    def __init__(self, throttle_minutes: int = 15):
        self.thresholds = {
            'cpu': 80,
            'memory': 85,
            'disk': 90,
            'network': 75
        }
        self.throttler = AlertThrottler(throttle_minutes)
        self.channel_manager = ChannelManager()

    def add_custom_channel(self, name: str, handler):
        """Add a custom alert delivery channel"""
        self.channel_manager.add_custom_channel(name, handler)

    def process_metrics_and_send_alerts(
        self,
        metrics: Dict[str, Any],
        alert_channels: List[str],
        enable_throttling: bool = True,
        severity_levels: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Process system metrics and send alerts if thresholds are exceeded.

        This refactored version delegates to specialized components for:
        - Validation (MetricsValidator)
        - Severity calculation (SeverityCalculator)
        - Throttling (AlertThrottler)
        - Formatting (AlertFormatter)
        - Channel delivery (ChannelManager)
        - Aggregation (StatisticsAggregator)

        Args:
            metrics: Dictionary of metric values
            alert_channels: List of channel names to send alerts to
            enable_throttling: Whether to throttle repeated alerts
            severity_levels: Optional custom severity levels per metric

        Returns:
            ProcessingResult with alerts sent, errors, and statistics
        """
        result = ProcessingResult()

        # Validate input
        validation_errors = MetricsValidator.validate(metrics)
        if validation_errors:
            result.errors.extend(validation_errors)
            return result.__dict__

        # Process each metric
        alerts_sent = []

        for metric_type, value in metrics.items():
            if metric_type == 'timestamp':
                continue

            if metric_type not in self.thresholds:
                continue

            threshold = self.thresholds[metric_type]

            # Check if threshold is exceeded
            if value <= threshold:
                result.processed_metrics.append(metric_type)
                continue

            # Calculate severity
            custom_severity = severity_levels.get(metric_type) if severity_levels else None
            severity = SeverityCalculator.calculate(value, threshold, custom_severity)

            # Check throttling
            if enable_throttling and not self.throttler.should_send_alert(metric_type):
                result.processed_metrics.append(metric_type)
                continue

            # Create alert
            alert = AlertFormatter.create_alert(
                metric_type, value, threshold, severity, metrics['timestamp']
            )

            # Send to channels
            channel_errors = self.channel_manager.send_alert(alert, alert_channels)
            result.errors.extend(channel_errors)

            # Record in history
            self.throttler.record_alert(metric_type, severity, value)

            alerts_sent.append(alert)
            result.alerts_sent += 1
            result.processed_metrics.append(metric_type)

        # Aggregate statistics
        if alerts_sent:
            result.aggregation = StatisticsAggregator.aggregate(
                alerts_sent,
                self.throttler.throttle_minutes
            )

        return {
            'alerts_sent': result.alerts_sent,
            'errors': result.errors,
            'processed_metrics': result.processed_metrics,
            'aggregation': result.aggregation
        }


def main():
    """Example usage of refactored code"""
    monitor = SystemMonitor(throttle_minutes=15)

    # Simulate some metrics
    metrics = {
        'cpu': 85,
        'memory': 92,
        'disk': 75,
        'network': 45,
        'timestamp': time.time()
    }

    channels = ['console', 'log']

    result = monitor.process_metrics_and_send_alerts(
        metrics,
        channels,
        enable_throttling=True
    )

    print(f"\nProcessing result: {json.dumps(result, indent=2)}")


if __name__ == '__main__':
    main()

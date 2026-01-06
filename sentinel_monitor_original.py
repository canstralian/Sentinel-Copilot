"""
Sentinel-Copilot: A system monitoring and alerting service
"""

import json
import time
from datetime import datetime
from typing import Dict, List, Any, Optional


class SystemMonitor:
    """Main system monitoring class"""

    def __init__(self):
        self.alert_history = []
        self.thresholds = {
            'cpu': 80,
            'memory': 85,
            'disk': 90,
            'network': 75
        }

    # COMPLEX FUNCTION - This function does too many things and is hard to understand
    def process_metrics_and_send_alerts(
        self,
        metrics: Dict[str, Any],
        alert_channels: List[str],
        enable_throttling: bool = True,
        throttle_minutes: int = 15,
        enable_aggregation: bool = True,
        severity_levels: Optional[Dict[str, str]] = None,
        custom_handlers: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process system metrics and send alerts if thresholds are exceeded.

        This function is overly complex and does too many things:
        - Validates input data
        - Checks multiple threshold conditions
        - Calculates severity levels
        - Handles alert throttling
        - Formats alert messages
        - Sends to multiple channels
        - Logs everything
        - Aggregates statistics
        """
        result = {'alerts_sent': 0, 'errors': [], 'processed_metrics': []}

        # Validate metrics
        if not metrics or not isinstance(metrics, dict):
            result['errors'].append('Invalid metrics format')
            return result

        # Check if we have required keys
        required_keys = ['cpu', 'memory', 'disk', 'network', 'timestamp']
        for key in required_keys:
            if key not in metrics:
                result['errors'].append(f'Missing required key: {key}')
                return result

        # Process each metric type
        alerts_to_send = []

        for metric_type, value in metrics.items():
            if metric_type == 'timestamp':
                continue

            if metric_type in self.thresholds:
                threshold = self.thresholds[metric_type]

                if value > threshold:
                    # Calculate severity
                    if severity_levels and metric_type in severity_levels:
                        severity = severity_levels[metric_type]
                    else:
                        if value > threshold * 1.5:
                            severity = 'critical'
                        elif value > threshold * 1.2:
                            severity = 'high'
                        elif value > threshold:
                            severity = 'medium'
                        else:
                            severity = 'low'

                    # Check throttling
                    should_send = True
                    if enable_throttling:
                        current_time = time.time()
                        for hist in self.alert_history:
                            if hist['metric_type'] == metric_type:
                                time_diff = (current_time - hist['timestamp']) / 60
                                if time_diff < throttle_minutes:
                                    should_send = False
                                    break

                    if should_send:
                        # Format message
                        msg = f"[{severity.upper()}] {metric_type.upper()} alert: {value}% (threshold: {threshold}%)"

                        # Add timestamp
                        ts = datetime.fromtimestamp(metrics['timestamp']).strftime('%Y-%m-%d %H:%M:%S')
                        msg += f" at {ts}"

                        # Create alert object
                        alert = {
                            'message': msg,
                            'severity': severity,
                            'metric_type': metric_type,
                            'value': value,
                            'threshold': threshold,
                            'timestamp': metrics['timestamp']
                        }

                        # Send to channels
                        for channel in alert_channels:
                            try:
                                if channel == 'console':
                                    print(msg)
                                elif channel == 'log':
                                    with open('alerts.log', 'a') as f:
                                        f.write(f"{msg}\n")
                                elif channel == 'email':
                                    # Simulate email sending
                                    if custom_handlers and 'email' in custom_handlers:
                                        custom_handlers['email'](alert)
                                    else:
                                        print(f"[EMAIL] {msg}")
                                elif channel == 'slack':
                                    # Simulate slack sending
                                    if custom_handlers and 'slack' in custom_handlers:
                                        custom_handlers['slack'](alert)
                                    else:
                                        print(f"[SLACK] {msg}")
                                elif channel == 'webhook':
                                    # Simulate webhook
                                    if custom_handlers and 'webhook' in custom_handlers:
                                        custom_handlers['webhook'](alert)
                                    else:
                                        print(f"[WEBHOOK] {msg}")
                                else:
                                    result['errors'].append(f"Unknown channel: {channel}")
                            except Exception as e:
                                result['errors'].append(f"Failed to send to {channel}: {str(e)}")

                        # Update history
                        self.alert_history.append({
                            'metric_type': metric_type,
                            'timestamp': time.time(),
                            'severity': severity,
                            'value': value
                        })

                        alerts_to_send.append(alert)
                        result['alerts_sent'] += 1

            result['processed_metrics'].append(metric_type)

        # Aggregation
        if enable_aggregation and alerts_to_send:
            severity_counts = {}
            for alert in alerts_to_send:
                sev = alert['severity']
                severity_counts[sev] = severity_counts.get(sev, 0) + 1

            result['aggregation'] = {
                'total_alerts': len(alerts_to_send),
                'by_severity': severity_counts,
                'time_window': f"{throttle_minutes} minutes" if enable_throttling else "none"
            }

        return result


def main():
    """Example usage"""
    monitor = SystemMonitor()

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
        enable_throttling=True,
        throttle_minutes=15
    )

    print(f"\nProcessing result: {json.dumps(result, indent=2)}")


if __name__ == '__main__':
    main()

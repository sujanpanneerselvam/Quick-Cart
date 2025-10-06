// Delivery dashboard functionality for QuickCart

document.addEventListener('DOMContentLoaded', function() {
    // Function to attach event listener to status buttons
    function attachStatusButtonListener(button) {
        button.addEventListener('click', function() {
            const orderId = this.getAttribute('data-order-id');
            const newStatus = this.getAttribute('data-status');
            
            const formData = new FormData();
            formData.append('order_id', orderId);
            formData.append('status', newStatus);
            
            // Get CSRF token from meta tag
            const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
            formData.append('csrf_token', csrfToken);
            
            fetch('/delivery/update_order_status', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Show success toast
                    const toast = new bootstrap.Toast(document.getElementById('statusToast'));
                    document.getElementById('statusToastBody').textContent = data.message;
                    toast.show();
                    
                    // Update UI
                    const orderCard = document.getElementById(`order-${orderId}`);
                    
                    if (orderCard) {
                        // Update status badge
                        const statusBadge = orderCard.querySelector('.order-status');
                        if (statusBadge) {
                            // Remove old status classes
                            statusBadge.classList.remove('status-pending', 'status-processing', 'status-shipped', 'status-delivered');
                            // Add new status class
                            statusBadge.classList.add(`status-${newStatus}`);
                            statusBadge.textContent = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
                        }
                        
                        // Move card to appropriate section
                        const currentSection = orderCard.parentNode;
                        let targetSection;
                        
                        if (newStatus === 'processing') {
                            targetSection = document.getElementById('processing-orders-container');
                        } else if (newStatus === 'shipped') {
                            // For shipped orders, update the button to "Mark as Delivered"
                            const actionCell = orderCard.querySelector('td:last-child');
                            if (actionCell) {
                                actionCell.innerHTML = `
                                    <button class="btn btn-sm btn-primary update-status-btn" 
                                            data-order-id="${orderId}" 
                                            data-status="delivered">
                                        <i class="fas fa-check-circle me-1"></i> Mark Delivered
                                    </button>
                                `;
                                // Re-attach event listener to the new button
                                const newButton = actionCell.querySelector('.update-status-btn');
                                if (newButton) {
                                    attachStatusButtonListener(newButton);
                                }
                            }
                        } else if (newStatus === 'delivered') {
                            // For delivered orders, remove the button
                            const actionCell = orderCard.querySelector('td:last-child');
                            if (actionCell) {
                                actionCell.innerHTML = `
                                    <span class="badge bg-success">
                                        <i class="fas fa-check me-1"></i> Delivered
                                    </span>
                                `;
                            }
                        }
                        
                        if (targetSection && currentSection !== targetSection) {
                            currentSection.removeChild(orderCard);
                            targetSection.appendChild(orderCard);
                            
                            // Update buttons based on new status
                            const buttonContainer = orderCard.querySelector('.order-actions');
                            if (buttonContainer) {
                                if (newStatus === 'processing') {
                                    buttonContainer.innerHTML = `
                                        <button class="btn btn-sm btn-success update-status-btn" 
                                                data-order-id="${orderId}" 
                                                data-status="shipped">
                                            Mark as Shipped
                                        </button>
                                    `;
                                }
                            }
                        }
                    }
                } else {
                    console.error('Error updating status:', data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
        });
    });
    
    // Attach event listeners to all status buttons
    const statusButtons = document.querySelectorAll('.update-status-btn');
    statusButtons.forEach(button => {
        attachStatusButtonListener(button);
    });
    
    // Order priority visualization
    const orderPriorityChart = document.getElementById('orderPriorityChart');
    if (orderPriorityChart) {
        // Get data from the data attributes
        const orders = JSON.parse(orderPriorityChart.getAttribute('data-orders'));
        
        // Prepare data for chart
        const labels = orders.map(order => `Order #${order.order_id}`);
        const expressOrders = orders.filter(order => order.delivery_type === 'express');
        const standardOrders = orders.filter(order => order.delivery_type === 'standard');
        
        const premiumExpressCount = expressOrders.filter(order => order.premium_member).length;
        const regularExpressCount = expressOrders.filter(order => !order.premium_member).length;
        const premiumStandardCount = standardOrders.filter(order => order.premium_member).length;
        const regularStandardCount = standardOrders.filter(order => !order.premium_member).length;
        
        // Create chart
        new Chart(orderPriorityChart, {
            type: 'bar',
            data: {
                labels: ['Express', 'Standard'],
                datasets: [
                    {
                        label: 'Premium Members',
                        data: [premiumExpressCount, premiumStandardCount],
                        backgroundColor: '#2e7d32',
                        borderColor: '#1b5e20',
                        borderWidth: 1
                    },
                    {
                        label: 'Regular Customers',
                        data: [regularExpressCount, regularStandardCount],
                        backgroundColor: '#4caf50',
                        borderColor: '#388e3c',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Orders'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Delivery Type'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Order Distribution by Type and Membership',
                        font: {
                            size: 16
                        }
                    },
                    legend: {
                        position: 'top'
                    }
                }
            }
        });
    }
    
    // Packing visualization (knapsack)
    const packingChart = document.getElementById('packingChart');
    if (packingChart) {
        try {
            // Get data from the data attributes
            const selectedOrdersData = packingChart.getAttribute('data-selected') || '[]';
            const selectedOrders = JSON.parse(selectedOrdersData);
            const totalWeight = parseFloat(packingChart.getAttribute('data-weight') || '0');
            const maxCapacity = parseFloat(packingChart.getAttribute('data-capacity') || '100');
            
            // Create chart - only if we have valid data
            if (!isNaN(totalWeight) && !isNaN(maxCapacity)) {
                new Chart(packingChart, {
                    type: 'pie',
                    data: {
                        labels: ['Used Capacity', 'Available Capacity'],
                        datasets: [{
                            data: [totalWeight, Math.max(0, maxCapacity - totalWeight)],
                            backgroundColor: ['#2e7d32', '#e0e0e0'],
                            borderColor: ['#1b5e20', '#bdbdbd'],
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Truck Capacity Utilization',
                                font: {
                                    size: 16
                                }
                            },
                            legend: {
                                position: 'top'
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const label = context.label || '';
                                        const value = context.raw || 0;
                                        return `${label}: ${value.toFixed(2)} kg`;
                                    }
                                }
                            }
                        }
                    }
                });
            }
            
            // Create a bar chart for selected orders
            const orderWeightChart = document.getElementById('orderWeightChart');
            if (orderWeightChart && selectedOrders && selectedOrders.length > 0) {
                // Make sure the orders have the expected properties
                const validOrders = selectedOrders.filter(order => 
                    order && order.order_id !== undefined && order.weight !== undefined);
                
                if (validOrders.length > 0) {
                    new Chart(orderWeightChart, {
                        type: 'bar',
                        data: {
                            labels: validOrders.map(order => `Order #${order.order_id}`),
                            datasets: [{
                                label: 'Order Weight (kg)',
                                data: validOrders.map(order => order.weight),
                                backgroundColor: '#4caf50',
                                borderColor: '#388e3c',
                                borderWidth: 1
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    title: {
                                        display: true,
                                        text: 'Weight (kg)'
                                    }
                                },
                                x: {
                                    title: {
                                        display: true,
                                        text: 'Orders'
                                    }
                                }
                            },
                            plugins: {
                                title: {
                                    display: true,
                                    text: 'Weight Distribution of Selected Orders',
                                    font: {
                                        size: 16
                                    }
                                }
                            }
                        }
                    });
                } else {
                    // If no valid orders, display a message
                    orderWeightChart.innerHTML = '<div class="alert alert-info mt-3">No order data available to display.</div>';
                }
            }
        } catch (error) {
            console.error('Error initializing packing charts:', error);
            // Display error message in the charts
            packingChart.innerHTML = '<div class="alert alert-danger mt-3">Error loading chart data. Please try again.</div>';
            
            const orderWeightChart = document.getElementById('orderWeightChart');
            if (orderWeightChart) {
                orderWeightChart.innerHTML = '<div class="alert alert-danger mt-3">Error loading chart data. Please try again.</div>';
            }
        }
    }
});

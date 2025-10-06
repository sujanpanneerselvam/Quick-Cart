// Visualization functionality for QuickCart

document.addEventListener('DOMContentLoaded', function() {
    // Route optimization visualization
    const routeMapContainer = document.getElementById('routeMap');
    if (routeMapContainer) {
        try {
            // Get data from the data attributes with error handling
            let locations = [];
            let route = [];
            
            try {
                const locationsData = routeMapContainer.getAttribute('data-locations');
                const routeData = routeMapContainer.getAttribute('data-route');
                
                if (locationsData && routeData) {
                    locations = JSON.parse(locationsData);
                    route = JSON.parse(routeData);
                }
            } catch (e) {
                console.error('Error parsing route data:', e);
            }
            
            // Check if we have valid data
            if (!locations || locations.length === 0) {
                routeMapContainer.innerHTML = `
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>No location data available for route visualization.
                    </div>
                `;
                return;
            }
            
            // Set up the map div
            routeMapContainer.innerHTML = `
                <div id="map-container" style="height: 400px; position: relative; background-color: #e9f5e9; border-radius: 8px; overflow: hidden;">
                    <div id="map-canvas" style="height: 100%; width: 100%;"></div>
                </div>
                <div class="card mt-3">
                    <div class="card-header bg-light">
                        <h6 class="mb-0"><i class="fas fa-info-circle me-2"></i>Route Information</h6>
                    </div>
                    <div class="card-body py-2">
                        <div id="route-details"></div>
                    </div>
                </div>
            `;
            
            const mapCanvas = document.getElementById('map-canvas');
            const routeDetails = document.getElementById('route-details');
            
            // Creating the canvas element
            const canvas = document.createElement('canvas');
            canvas.width = mapCanvas.clientWidth;
            canvas.height = mapCanvas.clientHeight;
            mapCanvas.appendChild(canvas);
            
            const ctx = canvas.getContext('2d');
            
            // Set map background
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, '#e8f5e9');
            gradient.addColorStop(1, '#c8e6c9');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw a grid for map-like appearance
            ctx.strokeStyle = 'rgba(0,0,0,0.1)';
            ctx.lineWidth = 1;
            
            // Draw grid lines
            const gridSize = 30;
            for (let i = 0; i < canvas.width; i += gridSize) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i, canvas.height);
                ctx.stroke();
            }
            
            for (let i = 0; i < canvas.height; i += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, i);
                ctx.lineTo(canvas.width, i);
                ctx.stroke();
            }
            
            // Draw points for each location
            const padding = 60;
            const maxLat = Math.max(...locations.map(loc => loc.lat)) + 0.01;
            const minLat = Math.min(...locations.map(loc => loc.lat)) - 0.01;
            const maxLng = Math.max(...locations.map(loc => loc.lng)) + 0.01;
            const minLng = Math.min(...locations.map(loc => loc.lng)) - 0.01;
            
            const latRange = maxLat - minLat;
            const lngRange = maxLng - minLng;
            
            // Function to convert lat/lng to canvas coordinates
            const getCanvasCoords = (lat, lng) => {
                const x = padding + ((lng - minLng) / lngRange) * (canvas.width - padding * 2);
                const y = padding + ((maxLat - lat) / latRange) * (canvas.height - padding * 2);
                return { x, y };
            };
            
            // Draw connections between points in route order with dashed lines for better visibility
            if (route && route.length > 0) {
                // First draw a shadow for the route line
                ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                ctx.lineWidth = 4;
                ctx.beginPath();
                
                for (let i = 0; i < route.length; i++) {
                    const location = locations[route[i]];
                    const { x, y } = getCanvasCoords(location.lat, location.lng);
                    
                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
                
                ctx.stroke();
                
                // Then draw the actual route line
                ctx.strokeStyle = '#2e7d32';
                ctx.lineWidth = 3;
                ctx.setLineDash([6, 3]); // Create dashed line for route
                ctx.beginPath();
                
                for (let i = 0; i < route.length; i++) {
                    const location = locations[route[i]];
                    const { x, y } = getCanvasCoords(location.lat, location.lng);
                    
                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
                
                ctx.stroke();
                ctx.setLineDash([]); // Reset to solid line
                
                // Draw direction arrows
                for (let i = 0; i < route.length - 1; i++) {
                    const locA = locations[route[i]];
                    const locB = locations[route[i + 1]];
                    const coordsA = getCanvasCoords(locA.lat, locA.lng);
                    const coordsB = getCanvasCoords(locB.lat, locB.lng);
                    
                    // Calculate midpoint
                    const midX = (coordsA.x + coordsB.x) / 2;
                    const midY = (coordsA.y + coordsB.y) / 2;
                    
                    // Calculate angle
                    const angle = Math.atan2(coordsB.y - coordsA.y, coordsB.x - coordsA.x);
                    
                    // Draw arrow
                    ctx.save();
                    ctx.translate(midX, midY);
                    ctx.rotate(angle);
                    
                    // Arrow shape
                    ctx.fillStyle = '#2e7d32';
                    ctx.beginPath();
                    ctx.moveTo(10, 0);
                    ctx.lineTo(0, 5);
                    ctx.lineTo(0, -5);
                    ctx.closePath();
                    ctx.fill();
                    
                    ctx.restore();
                    
                    // Draw order numbers along the route
                    ctx.fillStyle = 'white';
                    ctx.strokeStyle = '#1b5e20';
                    ctx.lineWidth = 1;
                    ctx.font = 'bold 14px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    
                    const numX = midX + 15 * Math.cos(angle + Math.PI/2);
                    const numY = midY + 15 * Math.sin(angle + Math.PI/2);
                    
                    ctx.beginPath();
                    ctx.arc(numX, numY, 12, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    
                    ctx.fillStyle = '#1b5e20';
                    ctx.fillText(i + 1, numX, numY);
                }
            }
            
            // Draw location markers and labels
            for (let i = 0; i < locations.length; i++) {
                const location = locations[i];
                const { x, y } = getCanvasCoords(location.lat, location.lng);
                
                // Draw marker shadow
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.beginPath();
                ctx.arc(x + 2, y + 2, i === 0 ? 10 : 8, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw marker
                ctx.beginPath();
                if (i === 0) {  // Warehouse is special
                    // Warehouse icon (building)
                    ctx.fillStyle = '#1b5e20';
                    ctx.fillRect(x - 10, y - 15, 20, 20);
                    
                    // Roof
                    ctx.beginPath();
                    ctx.moveTo(x - 15, y - 15);
                    ctx.lineTo(x, y - 25);
                    ctx.lineTo(x + 15, y - 15);
                    ctx.closePath();
                    ctx.fill();
                    
                    // Door
                    ctx.fillStyle = '#c8e6c9';
                    ctx.fillRect(x - 3, y - 8, 6, 13);
                } else {
                    // Package icon (for delivery locations)
                    ctx.fillStyle = '#4caf50';
                    
                    // Draw package
                    ctx.fillRect(x - 7, y - 7, 14, 14);
                    
                    // Draw ribbon
                    ctx.strokeStyle = '#c8e6c9';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(x, y - 7);
                    ctx.lineTo(x, y + 7);
                    ctx.moveTo(x - 7, y);
                    ctx.lineTo(x + 7, y);
                    ctx.stroke();
                }
                
                // Draw label background
                const labelText = location.name;
                ctx.font = 'bold 12px Arial';
                const textWidth = ctx.measureText(labelText).width;
                
                ctx.fillStyle = 'rgba(255,255,255,0.8)';
                ctx.fillRect(x - textWidth/2 - 5, y - 40, textWidth + 10, 20);
                ctx.strokeStyle = '#388e3c';
                ctx.lineWidth = 1;
                ctx.strokeRect(x - textWidth/2 - 5, y - 40, textWidth + 10, 20);
                
                // Draw label text
                ctx.fillStyle = '#212121';
                ctx.textAlign = 'center';
                ctx.fillText(labelText, x, y - 28);
            }
            
            // Create route information text
            let routeInfoHTML = '<ul class="list-unstyled mb-0" style="font-size: 0.85rem;">';
            
            if (route && route.length > 0) {
                for (let i = 0; i < route.length; i++) {
                    const location = locations[route[i]];
                    
                    if (i === 0) {
                        routeInfoHTML += `<li><strong>Start:</strong> ${location.name}</li>`;
                    } else if (i === route.length - 1) {
                        routeInfoHTML += `<li><strong>End:</strong> ${location.name}</li>`;
                    } else {
                        routeInfoHTML += `<li><strong>Stop ${i}:</strong> ${location.name}</li>`;
                    }
                }
            } else {
                routeInfoHTML += '<li>No route available</li>';
            }
            
            routeInfoHTML += '</ul>';
            routeDetails.innerHTML = routeInfoHTML;
        } catch (error) {
            console.error('Error rendering route map:', error);
            routeMapContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>Error displaying route map. Please try again.
                </div>
            `;
        }
    }
    
    // Create a delivery stats chart
    const deliveryStatsChart = document.getElementById('deliveryStatsChart');
    if (deliveryStatsChart) {
        try {
            const pending = parseInt(deliveryStatsChart.getAttribute('data-pending')) || 0;
            const processing = parseInt(deliveryStatsChart.getAttribute('data-processing')) || 0;
            const shipped = parseInt(deliveryStatsChart.getAttribute('data-shipped')) || 0;
            const delivered = parseInt(deliveryStatsChart.getAttribute('data-delivered')) || 0;
            
            new Chart(deliveryStatsChart, {
                type: 'doughnut',
                data: {
                    labels: ['Pending', 'Processing', 'Shipped', 'Delivered'],
                    datasets: [{
                        data: [pending, processing, shipped, delivered],
                        backgroundColor: ['#ff9800', '#2196f3', '#2e7d32', '#4caf50'],
                        borderColor: ['#f57c00', '#1976d2', '#1b5e20', '#388e3c'],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Order Status Distribution',
                            font: {
                                size: 16
                            }
                        },
                        legend: {
                            position: 'right'
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creating delivery stats chart:', error);
            deliveryStatsChart.innerHTML = `
                <div class="alert alert-danger mt-3">
                    <i class="fas fa-exclamation-triangle me-2"></i>Error loading chart data. Please try again.
                </div>
            `;
        }
    }
    
    // Order Priority Chart in Order Optimization
    const orderPriorityChart = document.getElementById('orderPriorityChart');
    if (orderPriorityChart) {
        try {
            // Get data from the data attributes
            const ordersData = orderPriorityChart.getAttribute('data-orders');
            if (!ordersData) {
                throw new Error('No order data found');
            }
            
            const orders = JSON.parse(ordersData);
            
            // Prepare data for chart
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
        } catch (error) {
            console.error('Error creating order priority chart:', error);
            orderPriorityChart.innerHTML = `
                <div class="alert alert-danger mt-3">
                    <i class="fas fa-exclamation-triangle me-2"></i>Error loading chart data. Please try again.
                </div>
            `;
        }
    }
    
    // Packing Chart and Order Weight Chart
    const packingChart = document.getElementById('packingChart');
    if (packingChart) {
        try {
            // Get data from the data attributes
            const selectedOrdersStr = packingChart.getAttribute('data-selected') || '[]';
            const selectedOrders = JSON.parse(selectedOrdersStr);
            const totalWeight = parseFloat(packingChart.getAttribute('data-weight') || '0');
            const maxCapacity = parseFloat(packingChart.getAttribute('data-capacity') || '100');
            
            // Create chart if we have valid data
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
                }
            }
        } catch (error) {
            console.error('Error initializing packing charts:', error);
            if (packingChart) {
                packingChart.insertAdjacentHTML('afterend', `
                    <div class="alert alert-danger mt-3">
                        <i class="fas fa-exclamation-triangle me-2"></i>Error loading chart data. Please try again.
                    </div>
                `);
            }
            
            const orderWeightChart = document.getElementById('orderWeightChart');
            if (orderWeightChart) {
                orderWeightChart.insertAdjacentHTML('afterend', `
                    <div class="alert alert-danger mt-3">
                        <i class="fas fa-exclamation-triangle me-2"></i>Error loading chart data. Please try again.
                    </div>
                `);
            }
        }
    }
});
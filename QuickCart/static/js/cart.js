// Cart functionality for QuickCart

document.addEventListener('DOMContentLoaded', function() {
    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };
    
    // Format weights
    const formatWeight = (weight) => {
        return `${weight.toFixed(2)} kg`;
    };
    
    // Update cart item quantity
    const updateCartForms = document.querySelectorAll('.update-cart-form');
    updateCartForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            
            fetch('/customer/update_cart', {
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
                    const toast = new bootstrap.Toast(document.getElementById('cartToast'));
                    document.getElementById('cartToastBody').textContent = data.message;
                    toast.show();
                    
                    // Update cart count
                    const cartCountBadge = document.querySelector('.cart-count');
                    if (cartCountBadge) {
                        cartCountBadge.textContent = data.cart_count;
                    }
                    
                    // Update totals
                    const totalPriceElement = document.getElementById('total-price');
                    const totalWeightElement = document.getElementById('total-weight');
                    
                    if (totalPriceElement) {
                        totalPriceElement.textContent = formatCurrency(data.total_price);
                    }
                    
                    if (totalWeightElement) {
                        totalWeightElement.textContent = formatWeight(data.total_weight);
                    }
                    
                    // If item was removed, remove the row
                    if (data.message.includes('removed')) {
                        const productId = formData.get('product_id');
                        const itemRow = document.getElementById(`cart-item-${productId}`);
                        if (itemRow) {
                            itemRow.remove();
                        }
                        
                        // If cart is empty, show empty message
                        if (data.cart_count === 0) {
                            const cartContainer = document.querySelector('.cart-container');
                            const emptyMessage = document.createElement('div');
                            emptyMessage.className = 'alert alert-info';
                            emptyMessage.textContent = 'Your cart is empty.';
                            
                            const checkoutButton = document.querySelector('.checkout-btn');
                            if (checkoutButton) {
                                checkoutButton.disabled = true;
                            }
                            
                            if (cartContainer) {
                                cartContainer.innerHTML = '';
                                cartContainer.appendChild(emptyMessage);
                            }
                        }
                    }
                } else {
                    console.error('Error updating cart:', data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
        });
    });
    
    // Quantity controls (+/- buttons)
    const decrementButtons = document.querySelectorAll('.quantity-decrement');
    const incrementButtons = document.querySelectorAll('.quantity-increment');
    
    decrementButtons.forEach(button => {
        button.addEventListener('click', function() {
            const input = this.parentNode.querySelector('.quantity-input');
            let value = parseInt(input.value);
            if (value > 0) {
                input.value = value - 1;
                // Trigger change event for form update
                const event = new Event('change');
                input.dispatchEvent(event);
            }
        });
    });
    
    incrementButtons.forEach(button => {
        button.addEventListener('click', function() {
            const input = this.parentNode.querySelector('.quantity-input');
            let value = parseInt(input.value);
            if (value < 10) {  // Max quantity
                input.value = value + 1;
                // Trigger change event for form update
                const event = new Event('change');
                input.dispatchEvent(event);
            }
        });
    });
    
    // Auto-submit form when quantity changes
    const quantityInputs = document.querySelectorAll('.quantity-input');
    quantityInputs.forEach(input => {
        input.addEventListener('change', function() {
            const form = this.closest('form');
            form.requestSubmit();
        });
    });
    
    // Order form validation
    const orderForm = document.getElementById('order-form');
    if (orderForm) {
        orderForm.addEventListener('submit', function(e) {
            const addressInput = document.getElementById('address');
            
            if (!addressInput.value.trim()) {
                e.preventDefault();
                
                // Show error
                const errorDiv = document.createElement('div');
                errorDiv.className = 'alert alert-danger mt-2';
                errorDiv.textContent = 'Please enter a delivery address';
                
                // Remove any existing error messages
                const existingError = addressInput.parentNode.querySelector('.alert');
                if (existingError) {
                    existingError.remove();
                }
                
                addressInput.parentNode.appendChild(errorDiv);
                addressInput.focus();
            }
        });
    }
});

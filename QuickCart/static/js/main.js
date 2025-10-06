// Main JavaScript file for QuickCart

document.addEventListener('DOMContentLoaded', function() {
    // Enable Bootstrap tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Enable Bootstrap popovers
    var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
    
    // Add animation to cards
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-5px)';
            card.style.boxShadow = '0 8px 15px rgba(0, 0, 0, 0.1)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.05)';
        });
    });
    
    // Keep flash messages visible until user dismisses them
    const flashMessages = document.querySelectorAll('.alert');
    // We're not setting a timeout - messages will stay until dismissed
    
    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };
    
    // Format prices in the DOM
    const priceElements = document.querySelectorAll('.price-format');
    priceElements.forEach(element => {
        const value = parseFloat(element.textContent);
        if (!isNaN(value)) {
            element.textContent = formatCurrency(value);
        }
    });
    
    // Handle role toggle in login/register form
    const roleToggle = document.querySelector('input[name="role"]');
    if (roleToggle) {
        const roleOptions = document.querySelectorAll('input[name="role"]');
        roleOptions.forEach(option => {
            option.addEventListener('change', function() {
                // You could add custom behavior here based on role selection
                console.log(`Role selected: ${this.value}`);
            });
        });
    }
    
    // Add to cart form handling
    const addToCartForms = document.querySelectorAll('.add-to-cart-form');
    addToCartForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            
            fetch('/customer/add_to_cart', {
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
                } else {
                    console.error('Error adding to cart:', data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
        });
    });
});

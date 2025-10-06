import json
import logging
import datetime
from flask import render_template, request, redirect, url_for, flash, session, jsonify
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from app import app, db
from models import User, Product, Order, OrderItem, HashTable
from forms import LoginForm, RegisterForm, OrderForm, AddToCartForm, UpdateCartForm
from algorithms import merge_sort, knapsack, tsp_dynamic_programming

# Add the current year to all template contexts
@app.context_processor
def inject_year():
    return {'current_year': datetime.datetime.now().year}

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Initialize cart in session
@app.before_request
def before_request():
    if 'cart' not in session:
        session['cart'] = {}

# Error handler
@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

# Routes for authentication and common pages
@app.route('/')
def index():
    if current_user.is_authenticated:
        if current_user.role == 'customer':
            return redirect(url_for('customer_dashboard'))
        else:
            return redirect(url_for('delivery_dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(email=form.email.data).first()
        if user and user.check_password(form.password.data) and user.role == form.role.data:
            login_user(user)
            if user.role == 'customer':
                return redirect(url_for('customer_dashboard'))
            else:
                return redirect(url_for('delivery_dashboard'))
        else:
            flash('Invalid email, password, or role', 'danger')
    return render_template('login.html', form=form)

@app.route('/register', methods=['GET', 'POST'])
def register():
    form = RegisterForm()
    if form.validate_on_submit():
        user = User(
            email=form.email.data,
            role=form.role.data
        )
        user.set_password(form.password.data)
        
        db.session.add(user)
        db.session.commit()
        
        flash('Registration successful! Please log in.', 'success')
        return redirect(url_for('login'))
    
    return render_template('login.html', form=form, register=True)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    session.pop('cart', None)
    flash('You have been logged out', 'info')
    return redirect(url_for('login'))

# Customer routes
@app.route('/customer/dashboard')
@login_required
def customer_dashboard():
    if current_user.role != 'customer':
        flash('Access denied: You must be a customer to view this page', 'danger')
        return redirect(url_for('index'))
    
    # Get recent orders
    recent_orders = Order.query.filter_by(user_id=current_user.user_id)\
                              .order_by(Order.created_at.desc())\
                              .limit(5).all()
    
    return render_template('customer/dashboard.html', recent_orders=recent_orders)

@app.route('/customer/products')
@login_required
def customer_products():
    if current_user.role != 'customer':
        flash('Access denied: You must be a customer to view this page', 'danger')
        return redirect(url_for('index'))
    
    products = Product.query.all()
    add_to_cart_form = AddToCartForm()
    
    return render_template('customer/products.html', products=products, form=add_to_cart_form)

@app.route('/customer/add_to_cart', methods=['POST'])
@login_required
def add_to_cart():
    if current_user.role != 'customer':
        return jsonify({'success': False, 'message': 'Access denied'}), 403
    
    form = AddToCartForm()
    if form.validate_on_submit():
        product_id = form.product_id.data
        quantity = int(form.quantity.data)
        
        # Get product info
        product = Product.query.get(product_id)
        
        if not product:
            return jsonify({'success': False, 'message': 'Product not found'}), 404
        
        # Update cart in session
        cart = session.get('cart', {})
        
        if product_id in cart:
            cart[product_id]['quantity'] += quantity
        else:
            cart[product_id] = {
                'id': product_id,
                'name': product.name,
                'price': product.price,
                'weight': product.weight,
                'quantity': quantity
            }
        
        session['cart'] = cart
        
        flash(f'Added {quantity} {product.name} to cart', 'success')
        return jsonify({'success': True, 'message': 'Item added to cart', 'cart_count': len(cart)})
    
    return jsonify({'success': False, 'message': 'Invalid form submission'}), 400

@app.route('/customer/cart')
@login_required
def customer_cart():
    if current_user.role != 'customer':
        flash('Access denied: You must be a customer to view this page', 'danger')
        return redirect(url_for('index'))
    
    # Get cart from session
    cart = session.get('cart', {})
    
    # Calculate totals
    total_price = sum(item['price'] * item['quantity'] for item in cart.values())
    total_weight = sum(item['weight'] * item['quantity'] for item in cart.values())
    
    # Initialize order form
    order_form = OrderForm()
    
    return render_template('customer/cart.html', 
                          cart=cart, 
                          total_price=total_price, 
                          total_weight=total_weight,
                          order_form=order_form)

@app.route('/customer/update_cart', methods=['POST'])
@login_required
def update_cart():
    if current_user.role != 'customer':
        return jsonify({'success': False, 'message': 'Access denied'}), 403
    
    form = UpdateCartForm()
    if form.validate_on_submit():
        product_id = form.product_id.data
        quantity = int(form.quantity.data)
        
        # Update cart in session
        cart = session.get('cart', {})
        
        if product_id in cart:
            if quantity > 0:
                cart[product_id]['quantity'] = quantity
                message = f'Updated quantity to {quantity}'
            else:
                del cart[product_id]
                message = 'Item removed from cart'
            
            session['cart'] = cart
            
            # Calculate new totals
            total_price = sum(item['price'] * item['quantity'] for item in cart.values())
            total_weight = sum(item['weight'] * item['quantity'] for item in cart.values())
            
            return jsonify({
                'success': True, 
                'message': message, 
                'cart_count': len(cart),
                'total_price': total_price,
                'total_weight': total_weight
            })
        
        return jsonify({'success': False, 'message': 'Item not found in cart'}), 404
    
    return jsonify({'success': False, 'message': 'Invalid form submission'}), 400

@app.route('/customer/place_order', methods=['POST'])
@login_required
def place_order():
    if current_user.role != 'customer':
        flash('Access denied: You must be a customer to place an order', 'danger')
        return redirect(url_for('index'))
    
    form = OrderForm()
    if form.validate_on_submit():
        # Get cart from session
        cart = session.get('cart', {})
        
        if not cart:
            flash('Your cart is empty', 'warning')
            return redirect(url_for('customer_cart'))
        
        # Calculate totals
        total_price = sum(item['price'] * item['quantity'] for item in cart.values())
        total_weight = sum(item['weight'] * item['quantity'] for item in cart.values())
        
        # Create new order
        order = Order(
            user_id=current_user.user_id,
            address=form.address.data,
            premium_member=form.premium_member.data,
            delivery_type=form.delivery_type.data,
            total_price=total_price,
            total_weight=total_weight,
            status='pending'
        )
        
        db.session.add(order)
        db.session.flush()  # To get the order ID
        
        # Add order items
        for item_id, item_data in cart.items():
            order_item = OrderItem(
                order_id=order.order_id,
                product_id=item_data['id'],
                quantity=item_data['quantity'],
                price=item_data['price']
            )
            db.session.add(order_item)
        
        # Store order details in hash table for O(1) lookup
        order_details = {
            'order_id': order.order_id,
            'user_id': order.user_id,
            'address': order.address,
            'premium_member': order.premium_member,
            'delivery_type': order.delivery_type,
            'total_price': order.total_price,
            'total_weight': order.total_weight,
            'status': order.status,
            'created_at': order.created_at.isoformat(),
            'items': [
                {
                    'product_id': item_data['id'],
                    'name': item_data['name'],
                    'quantity': item_data['quantity'],
                    'price': item_data['price']
                } for item_id, item_data in cart.items()
            ]
        }
        
        HashTable.insert(order.order_id, order_details)
        
        db.session.commit()
        
        # Clear cart
        session['cart'] = {}
        
        flash('Order placed successfully!', 'success')
        return redirect(url_for('customer_dashboard'))
    
    flash('Error in order form submission', 'danger')
    return redirect(url_for('customer_cart'))

# Delivery routes
@app.route('/delivery/dashboard')
@login_required
def delivery_dashboard():
    if current_user.role != 'delivery':
        flash('Access denied: You must be a delivery person to view this page', 'danger')
        return redirect(url_for('index'))
    
    # Get pending orders
    pending_orders = Order.query.filter_by(status='pending').all()
    
    # Get processing orders
    processing_orders = Order.query.filter_by(status='processing').all()
    
    return render_template('delivery/dashboard.html', 
                          pending_orders=pending_orders,
                          processing_orders=processing_orders)

@app.route('/delivery/order_optimization')
@login_required
def order_optimization():
    if current_user.role != 'delivery':
        flash('Access denied: You must be a delivery person to view this page', 'danger')
        return redirect(url_for('index'))
    
    # Get pending orders
    pending_orders = Order.query.filter_by(status='pending').all()
    
    # Convert to list of dictionaries for the algorithm
    orders = []
    for order in pending_orders:
        orders.append({
            'order_id': order.order_id,
            'user_id': order.user_id,
            'address': order.address,
            'premium_member': order.premium_member,
            'delivery_type': order.delivery_type,
            'total_price': order.total_price,
            'total_weight': order.total_weight,
            'created_at': order.created_at.isoformat()
        })
    
    # Sort orders using merge sort
    sorted_orders = merge_sort(orders, 'urgency')
    
    return render_template('delivery/order_optimization.html', 
                          pending_orders=pending_orders,
                          sorted_orders=sorted_orders)

@app.route('/delivery/packing_optimization')
@login_required
def packing_optimization():
    if current_user.role != 'delivery':
        flash('Access denied: You must be a delivery person to view this page', 'danger')
        return redirect(url_for('index'))
    
    # Get pending orders
    pending_orders = Order.query.filter_by(status='pending').all()
    
    # Convert to list of dictionaries for the algorithm
    orders = []
    for order in pending_orders:
        orders.append({
            'order_id': order.order_id,
            'user_id': order.user_id,
            'address': order.address,
            'premium_member': order.premium_member,
            'delivery_type': order.delivery_type,
            'weight': order.total_weight,
            'value': order.total_price,  # Using price as value for knapsack
            'created_at': order.created_at.isoformat()
        })
    
    # Maximum capacity for the truck (example value)
    max_capacity = 100  # kg
    
    # Apply knapsack algorithm
    selected_indices, total_value = knapsack(orders, max_capacity)
    
    # Get selected orders
    selected_orders = [orders[i] for i in selected_indices]
    
    # Total weight of selected orders
    total_weight = sum(order['weight'] for order in selected_orders)
    
    return render_template('delivery/packing_optimization.html', 
                          pending_orders=pending_orders,
                          selected_orders=selected_orders,
                          total_value=total_value,
                          total_weight=total_weight,
                          max_capacity=max_capacity)

@app.route('/delivery/route_optimization')
@login_required
def route_optimization():
    if current_user.role != 'delivery':
        flash('Access denied: You must be a delivery person to view this page', 'danger')
        return redirect(url_for('index'))
    
    # Get processing orders
    processing_orders = Order.query.filter_by(status='processing').all()
    
    # Default values (for when there are no orders)
    route = []
    route_locations = []
    total_distance = 0
    
    # Create locations list - always include the warehouse
    locations = [
        {'name': 'Warehouse (Karur)', 'lat': 10.9601, 'lng': 78.0766},  # Karur, Tamil Nadu
    ]
    
    # Only proceed with route optimization if we have orders to process
    if processing_orders:
        for order in processing_orders:
            # Generate locations for demonstration
            import random
            lat_offset = random.uniform(-0.1, 0.1)
            lng_offset = random.uniform(-0.1, 0.1)
            
            # Generate locations around Karur
            locations.append({
                'name': f'Order #{order.order_id}',
                'lat': 10.9601 + lat_offset,
                'lng': 78.0766 + lng_offset,
                'order_id': order.order_id
            })
        
        # Create distance matrix
        n = len(locations)
        distances = [[0 for _ in range(n)] for _ in range(n)]
        
        # Calculate Euclidean distances between locations
        for i in range(n):
            for j in range(n):
                if i != j:
                    # Simple Euclidean distance for demonstration
                    distances[i][j] = ((locations[i]['lat'] - locations[j]['lat'])**2 + 
                                     (locations[i]['lng'] - locations[j]['lng'])**2)**0.5
        
        # Only apply TSP if we have more than just the warehouse
        if n > 1:
            # Apply TSP to find optimal route
            route, total_distance = tsp_dynamic_programming(distances)
            
            # Get locations in route order
            route_locations = [locations[i] for i in route]
        else:
            # Default for a single location (just the warehouse)
            route = [0]
            route_locations = [locations[0]]
    
    return render_template('delivery/route_optimization.html', 
                          processing_orders=processing_orders,
                          locations=locations,
                          route=route,
                          route_locations=route_locations,
                          total_distance=total_distance)

@app.route('/delivery/update_order_status', methods=['POST'])
@login_required
def update_order_status():
    if current_user.role != 'delivery':
        return jsonify({'success': False, 'message': 'Access denied'}), 403
    
    # Validate CSRF token
    csrf_token = request.form.get('csrf_token')
    if not csrf_token:
        return jsonify({'success': False, 'message': 'CSRF token missing'}), 400
    
    # Because we're handling CSRF manually in AJAX, we need to validate the token
    from flask_wtf.csrf import validate_csrf
    try:
        validate_csrf(csrf_token)
    except:
        return jsonify({'success': False, 'message': 'Invalid CSRF token'}), 400
    
    order_id = request.form.get('order_id')
    new_status = request.form.get('status')
    
    if not order_id or not new_status:
        return jsonify({'success': False, 'message': 'Missing order ID or status'}), 400
    
    # Get order
    order = Order.query.get(order_id)
    
    if not order:
        return jsonify({'success': False, 'message': 'Order not found'}), 404
    
    # Update status
    order.status = new_status
    db.session.commit()
    
    # Update hash table
    order_details = HashTable.get(order_id)
    if order_details:
        order_details['status'] = new_status
        HashTable.insert(order_id, order_details)
    
    return jsonify({'success': True, 'message': f'Order status updated to {new_status}'})

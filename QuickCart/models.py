from datetime import datetime
from app import db
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
import json

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    
    user_id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'customer' or 'delivery'
    
    # Relationship with orders
    orders = db.relationship('Order', backref='user', lazy=True)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def get_id(self):
        return str(self.user_id)

class Product(db.Model):
    __tablename__ = 'products'
    
    product_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    price = db.Column(db.Float, nullable=False)
    weight = db.Column(db.Float, nullable=False)  # in kg
    stock = db.Column(db.Integer, nullable=False, default=0)
    
    # Relationship with order items
    order_items = db.relationship('OrderItem', backref='product', lazy=True)

class Order(db.Model):
    __tablename__ = 'orders'
    
    order_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    address = db.Column(db.String(200), nullable=False)
    premium_member = db.Column(db.Boolean, default=False)
    delivery_type = db.Column(db.String(20), nullable=False)  # 'express' or 'standard'
    total_price = db.Column(db.Float, nullable=False)
    total_weight = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default='pending')  # 'pending', 'processing', 'shipped', 'delivered'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship with order items
    items = db.relationship('OrderItem', backref='order', lazy=True, cascade="all, delete-orphan")

class OrderItem(db.Model):
    __tablename__ = 'order_items'
    
    order_item_id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.order_id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.product_id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Float, nullable=False)  # Price at the time of order

class HashTable(db.Model):
    __tablename__ = 'hashtable'
    
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), nullable=False, unique=True)  # order_id as key
    value = db.Column(db.Text, nullable=False)  # Serialized order details
    next_id = db.Column(db.Integer, db.ForeignKey('hashtable.id'), nullable=True)  # For chaining in case of collision
    
    next_entry = db.relationship('HashTable', remote_side=[id], backref='previous', uselist=False)
    
    @staticmethod
    def hash_function(key, table_size=100):
        """Simple hash function for demonstration"""
        return hash(str(key)) % table_size
    
    @staticmethod
    def insert(order_id, order_details):
        """Insert an order into the hash table"""
        key = str(order_id)
        hash_index = HashTable.hash_function(key)
        bucket_key = f"bucket_{hash_index}"
        
        # Serialize order details
        value = json.dumps(order_details)
        
        # Check if bucket exists
        existing_entry = HashTable.query.filter_by(key=bucket_key).first()
        
        if not existing_entry:
            # Create new bucket entry
            entry = HashTable(key=bucket_key, value=value)
            db.session.add(entry)
        else:
            # Handle collision with chaining
            current = existing_entry
            while current.next_entry:
                if current.key == key:
                    # Update existing entry
                    current.value = value
                    break
                current = current.next_entry
            else:
                # Add to end of chain
                new_entry = HashTable(key=key, value=value)
                db.session.add(new_entry)
                current.next_id = new_entry.id
        
        db.session.commit()
    
    @staticmethod
    def get(order_id):
        """Get order details from the hash table"""
        key = str(order_id)
        hash_index = HashTable.hash_function(key)
        bucket_key = f"bucket_{hash_index}"
        
        entry = HashTable.query.filter_by(key=bucket_key).first()
        
        if not entry:
            return None
        
        # Check in the chain
        current = entry
        while current:
            if current.key == key:
                return json.loads(current.value)
            current = current.next_entry
        
        return None

from app import db
from models import User, Product, Order, OrderItem
from werkzeug.security import generate_password_hash
import logging

def init_db():
    """Initialize the database with sample data if it's empty"""
    if User.query.count() == 0:
        logging.info("Initializing database with sample data...")
        
        # Create sample users
        create_sample_users()
        
        # Create sample products
        create_sample_products()
        
        logging.info("Database initialization complete!")

def create_sample_users():
    """Create sample users for testing"""
    users = [
        {
            'email': 'customer@example.com',
            'password': 'password123',
            'role': 'customer'
        },
        {
            'email': 'delivery@example.com',
            'password': 'password123',
            'role': 'delivery'
        }
    ]
    
    for user_data in users:
        user = User(
            email=user_data['email'],
            role=user_data['role']
        )
        user.set_password(user_data['password'])
        db.session.add(user)
    
    db.session.commit()
    logging.info("Sample users created")

def create_sample_products():
    """Create sample products for testing"""
    products = [
        {
            'name': 'Organic Bananas',
            'description': 'Fresh organic bananas, bundle of 5',
            'price': 2.99,
            'weight': 0.5,
            'stock': 100
        },
        {
            'name': 'Whole Wheat Bread',
            'description': 'Freshly baked whole wheat bread',
            'price': 3.49,
            'weight': 0.7,
            'stock': 50
        },
        {
            'name': 'Milk (1 Gallon)',
            'description': 'Whole milk, 1 gallon',
            'price': 4.29,
            'weight': 3.78,
            'stock': 60
        },
        {
            'name': 'Eggs (Dozen)',
            'description': 'Farm fresh large eggs, dozen',
            'price': 3.99,
            'weight': 0.7,
            'stock': 80
        },
        {
            'name': 'Chicken Breast',
            'description': 'Boneless skinless chicken breast, 1 lb',
            'price': 5.99,
            'weight': 0.45,
            'stock': 40
        },
        {
            'name': 'Apples',
            'description': 'Fresh apples, bag of 6',
            'price': 4.49,
            'weight': 1.2,
            'stock': 70
        },
        {
            'name': 'Pasta',
            'description': 'Spaghetti pasta, 16 oz',
            'price': 1.99,
            'weight': 0.45,
            'stock': 100
        },
        {
            'name': 'Tomato Sauce',
            'description': 'Organic tomato sauce, 24 oz jar',
            'price': 2.79,
            'weight': 0.68,
            'stock': 90
        },
        {
            'name': 'Rice',
            'description': 'Jasmine rice, 5 lb bag',
            'price': 6.99,
            'weight': 2.27,
            'stock': 55
        },
        {
            'name': 'Coffee',
            'description': 'Premium ground coffee, 12 oz',
            'price': 8.99,
            'weight': 0.34,
            'stock': 45
        }
    ]
    
    for product_data in products:
        product = Product(**product_data)
        db.session.add(product)
    
    db.session.commit()
    logging.info("Sample products created")

from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, RadioField, SelectField, FloatField, BooleanField, SubmitField, HiddenField
from wtforms.validators import DataRequired, Email, Length, EqualTo, ValidationError
from models import User

class LoginForm(FlaskForm):
    email = StringField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Password', validators=[DataRequired()])
    role = RadioField('Role', choices=[('customer', 'Customer'), ('delivery', 'Delivery Person')], validators=[DataRequired()])
    submit = SubmitField('Login')

class RegisterForm(FlaskForm):
    email = StringField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Password', validators=[DataRequired(), Length(min=6)])
    confirm_password = PasswordField('Confirm Password', validators=[DataRequired(), EqualTo('password')])
    role = RadioField('Role', choices=[('customer', 'Customer'), ('delivery', 'Delivery Person')], validators=[DataRequired()])
    submit = SubmitField('Register')
    
    def validate_email(self, email):
        user = User.query.filter_by(email=email.data).first()
        if user:
            raise ValidationError('Email already registered. Please use a different email.')

class OrderForm(FlaskForm):
    address = StringField('Delivery Address', validators=[DataRequired(), Length(max=200)])
    premium_member = BooleanField('Premium Membership')
    delivery_type = RadioField('Delivery Type', choices=[('express', 'Express'), ('standard', 'Standard')], validators=[DataRequired()])
    submit = SubmitField('Place Order')

class AddToCartForm(FlaskForm):
    product_id = HiddenField('Product ID', validators=[DataRequired()])
    quantity = SelectField('Quantity', choices=[(str(i), str(i)) for i in range(1, 11)], validators=[DataRequired()])
    submit = SubmitField('Add to Cart')

class UpdateCartForm(FlaskForm):
    product_id = HiddenField('Product ID', validators=[DataRequired()])
    quantity = SelectField('Quantity', choices=[(str(i), str(i)) for i in range(0, 11)], validators=[DataRequired()])
    submit = SubmitField('Update')

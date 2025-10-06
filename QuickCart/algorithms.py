def merge_sort(orders, key='urgency'):
    """
    Merge sort implementation for sorting orders by urgency and membership
    
    Args:
        orders: List of order dictionaries
        key: The key to sort by (default: 'urgency')
        
    Returns:
        Sorted list of orders
    """
    if len(orders) <= 1:
        return orders
    
    # Divide
    mid = len(orders) // 2
    left = merge_sort(orders[:mid], key)
    right = merge_sort(orders[mid:], key)
    
    # Conquer
    return merge(left, right, key)

def merge(left, right, key):
    """Helper function for merge sort"""
    result = []
    i = j = 0
    
    while i < len(left) and j < len(right):
        # For urgency, we consider both delivery_type and premium_member
        # Express orders have higher priority than standard
        # Within same delivery type, premium members have higher priority
        if key == 'urgency':
            left_urgency = 2 if left[i]['delivery_type'] == 'express' else 0
            left_urgency += 1 if left[i]['premium_member'] else 0
            
            right_urgency = 2 if right[j]['delivery_type'] == 'express' else 0
            right_urgency += 1 if right[j]['premium_member'] else 0
            
            if left_urgency >= right_urgency:
                result.append(left[i])
                i += 1
            else:
                result.append(right[j])
                j += 1
        else:
            # Default comparison using the specified key
            if left[i][key] <= right[j][key]:
                result.append(left[i])
                i += 1
            else:
                result.append(right[j])
                j += 1
    
    # Add remaining elements
    result.extend(left[i:])
    result.extend(right[j:])
    
    return result

def knapsack(orders, max_capacity):
    """
    0/1 Knapsack algorithm for packing optimization
    
    Args:
        orders: List of order dictionaries with 'weight' and 'value' keys
        max_capacity: Maximum weight capacity of the delivery vehicle
        
    Returns:
        List of selected order indices and total value
    """
    # Handle empty orders list
    if not orders:
        return [], 0
    
    n = len(orders)
    
    # Validate input data
    for order in orders:
        if not isinstance(order.get('weight'), (int, float)) or not isinstance(order.get('value'), (int, float)):
            # If we have invalid data, return empty selection
            return [], 0
    
    # Scale weights to integers to avoid floating point issues
    # We'll use 100 as a scaling factor to preserve 2 decimal places
    scale_factor = 100
    scaled_max_capacity = int(max_capacity * scale_factor)
    
    # Store scaled weights for each order
    scaled_weights = []
    for order in orders:
        # Convert to int to ensure we're using integer indices
        scaled_weights.append(int(order['weight'] * scale_factor))
    
    # Initialize DP table: dp[i][w] = max value that can be obtained with first i items and capacity w
    # +1 because we need to include capacity of 0 and item count of 0
    dp = [[0 for _ in range(scaled_max_capacity + 1)] for _ in range(n + 1)]
    
    # Fill the DP table
    for i in range(1, n + 1):
        for w in range(scaled_max_capacity + 1):
            # Current order's weight and value
            weight = scaled_weights[i-1]
            value = orders[i-1]['value']
            
            if weight <= w:
                # Max of (not taking current item, taking current item)
                dp[i][w] = max(dp[i-1][w], dp[i-1][w-weight] + value)
            else:
                # Can't take current item if it exceeds capacity
                dp[i][w] = dp[i-1][w]
    
    # Find which orders were selected
    selected = []
    w = scaled_max_capacity
    for i in range(n, 0, -1):
        if i > 0 and w >= 0 and dp[i][w] != dp[i-1][w]:
            selected.append(i-1)  # The order at index i-1 was selected
            w -= scaled_weights[i-1]
            # Ensure w doesn't go negative
            if w < 0:
                w = 0
    
    selected.reverse()  # To maintain the original order
    
    # Calculate the total value of selected items
    total_value = sum(orders[i]['value'] for i in selected)
    
    return selected, total_value

def tsp_dynamic_programming(distances):
    """
    Traveling Salesman Problem using Dynamic Programming for route optimization
    
    Args:
        distances: Matrix of distances between locations
        
    Returns:
        Optimal route and total distance
    """
    n = len(distances)
    
    # Initialize DP table: dp[mask][i] = min distance to visit all vertices in mask and end at vertex i
    # mask is a bitmask representing visited vertices
    all_visited = (1 << n) - 1  # All vertices visited
    dp = {}
    
    # Function to solve TSP recursively with memoization
    def solve(mask, pos):
        if mask == all_visited:
            return distances[pos][0]  # Return to starting point (0)
        
        if (mask, pos) in dp:
            return dp[(mask, pos)]
        
        ans = float('inf')
        for next_pos in range(n):
            if (mask & (1 << next_pos)) == 0:  # If next_pos is not visited
                new_ans = distances[pos][next_pos] + solve(mask | (1 << next_pos), next_pos)
                ans = min(ans, new_ans)
        
        dp[(mask, pos)] = ans
        return ans
    
    # Start from vertex 0 with only vertex 0 visited
    min_distance = solve(1, 0)  # 1 is the bitmask for vertex 0 visited
    
    # Reconstruct the path
    path = [0]  # Start from vertex 0
    mask = 1  # Only vertex 0 is visited initially
    pos = 0
    
    for _ in range(n-1):
        next_vertex = None
        min_cost = float('inf')
        
        for next_pos in range(n):
            if (mask & (1 << next_pos)) == 0:  # If next_pos is not visited
                cost = distances[pos][next_pos] + dp.get((mask | (1 << next_pos), next_pos), float('inf'))
                if cost < min_cost:
                    min_cost = cost
                    next_vertex = next_pos
        
        if next_vertex is not None:
            path.append(next_vertex)
            mask |= (1 << next_vertex)
            pos = next_vertex
    
    path.append(0)  # Return to start
    
    return path, min_distance

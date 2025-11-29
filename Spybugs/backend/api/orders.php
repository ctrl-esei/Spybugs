<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../config/config.php';

$method = $_SERVER['REQUEST_METHOD'];

function json_error(string $msg, int $code = 400): void
{
    http_response_code($code);
    echo json_encode([
        'status'  => 'error',
        'message' => $msg,
    ]);
    exit;
}

function map_status_input(?string $status): string
{
    if ($status === null) {
        $status = '';
    }
    $s = strtolower(trim($status));

    $map = [
        ''            => 'pending',
        'pending'     => 'pending',

        'in-queue'    => 'in-queue',
        'printing'    => 'printing',
        'ready'       => 'ready',
        'released'    => 'released',
        'cancelled'   => 'cancelled',

        'in_progress' => 'printing', 
        'in progress' => 'printing',
        'completed'   => 'released',
        'done'        => 'released',
    ];

    $val = $map[$s] ?? 'pending';

    $allowed = ['pending','in-queue','printing','ready','released','cancelled'];
    if (!in_array($val, $allowed, true)) {
        return 'pending';
    }
    return $val;
}

function map_payment_input(?string $payment): string
{
    if ($payment === null) {
        return 'unpaid';
    }
    $p = strtolower(trim($payment));
    if (!in_array($p, ['unpaid','partial','paid'], true)) {
        return 'unpaid';
    }
    return $p;
}

function attach_items_to_orders(PDO $pdo, array &$orders): void
{
    if (empty($orders)) {
        return;
    }

    $ids = array_column($orders, 'id');
    $placeholders = implode(',', array_fill(0, count($ids), '?'));

    $sql = "
        SELECT
            order_id,
            item_name,
            quantity,
            pages,
            total_pages,
            unit_price,
            line_total
        FROM order_items
        WHERE order_id IN ($placeholders)
        ORDER BY id ASC
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($ids);
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $byOrder = [];
    foreach ($items as $row) {
        $oid = (int)$row['order_id'];
        if (!isset($byOrder[$oid])) {
            $byOrder[$oid] = [];
        }
        $byOrder[$oid][] = [
            'item_name'   => $row['item_name'],
            'quantity'    => (int)$row['quantity'],
            'pages'       => $row['pages'] !== null ? (int)$row['pages'] : null,
            'total_pages' => $row['total_pages'] !== null ? (int)$row['total_pages'] : null,
            'unit_price'  => (float)$row['unit_price'],
            'total_price' => (float)$row['line_total'],
        ];
    }

    foreach ($orders as &$o) {
        $oid = (int)$o['id'];
        $o['items'] = $byOrder[$oid] ?? [];
    }
    unset($o);
}

// this is admin only
if ($method === 'GET') {
    if (!isset($_SESSION['admin_id'])) {
        echo json_encode([
            'status'  => 'error',
            'message' => 'Unauthorized',
        ]);
        exit;
    }

    try {
        $sql = "
            SELECT
                id,
                order_code AS reference,
                customer_name,
                total_amount,
                discount,
                payment_status,
                status,
                created_at,
                updated_at
            FROM orders
            ORDER BY created_at DESC
        ";
        $stmt = $pdo->query($sql);
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($orders as &$o) {
            $o['id']             = (int)$o['id'];
            $o['total_amount']   = (float)$o['total_amount'];
            $o['discount']       = (float)$o['discount'];
            $o['payment_status'] = $o['payment_status'] ?? 'unpaid';
            $o['status']         = $o['status'] ?? 'pending';
        }
        unset($o);

        attach_items_to_orders($pdo, $orders);

        echo json_encode([
            'status' => 'success',
            'orders' => $orders,
        ]);
    } catch (Throwable $e) {
        json_error('Failed to load orders: ' . $e->getMessage(), 500);
    }
    exit;
}

// Only GET + POST allowed
if ($method !== 'POST') {
    json_error('Invalid request method', 405);
}

$input  = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $input['action'] ?? null;

if (!$action && isset($input['id']) && (isset($input['status']) || isset($input['payment_status']))) {
    $action = 'update';
}

if (!$action) {
    json_error('Missing action.');
}

// for create + update, require admin session
if ($action !== 'track' && !isset($_SESSION['admin_id'])) {
    echo json_encode([
        'status'  => 'error',
        'message' => 'Unauthorized',
    ]);
    exit;
}

switch ($action) {
    // Create order
    case 'create':
        $customerName = trim($input['customer_name'] ?? '');
        if ($customerName === '') {
            json_error('Customer name is required.');
        }

        $items = $input['items'] ?? [];
        if (!is_array($items) || count($items) === 0) {
            json_error('At least one item is required.');
        }

        // Sum from items
        $totalFromItems = 0.0;
        foreach ($items as $it) {
            $qty  = isset($it['quantity']) ? (int)$it['quantity'] : 0;
            $unit = isset($it['price']) ? (float)$it['price'] : 0.0;
            $line = isset($it['total_price'])
                ? (float)$it['total_price']
                : ($qty * $unit);
            $totalFromItems += $line;
        }

        $subtotal = isset($input['subtotal'])
            ? (float)$input['subtotal']
            : $totalFromItems;

        $discount = isset($input['discount'])
            ? (float)$input['discount']
            : 0.0;

        if ($discount < 0) {
            $discount = 0.0;
        }
        if ($discount > $subtotal) {
            $discount = $subtotal;
        }

        $total = isset($input['total'])
            ? (float)$input['total']
            : ($subtotal - $discount);

        if ($total < 0) {
            $total = 0.0;
        }

        $paymentStatus = map_payment_input($input['payment_status'] ?? 'unpaid');
        $status        = map_status_input($input['status'] ?? 'pending');

        // simple reference code
        $reference = strtoupper('SPY-' . date('Ymd') . '-' . substr(uniqid('', true), -5));

        try {
            $pdo->beginTransaction();
            $stmt = $pdo->prepare("
                INSERT INTO orders
                    (order_code, customer_name, total_amount, discount, payment_status, status)
                VALUES
                    (?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $reference,
                $customerName,
                $total,
                $discount,
                $paymentStatus,
                $status,
            ]);

            $orderId = (int)$pdo->lastInsertId();

            // Insert items
            $stmtItem = $pdo->prepare("
                INSERT INTO order_items
                    (order_id, inventory_id, item_name, quantity, pages, total_pages, unit_price, line_total)
                VALUES
                    (?, NULL, ?, ?, ?, ?, ?, ?)
            ");

            foreach ($items as $it) {
                $name = trim($it['name'] ?? ($it['item_name'] ?? 'Item'));
                if ($name === '') {
                    $name = 'Item';
                }

                $qty = isset($it['quantity']) ? (int)$it['quantity'] : 0;
                if ($qty <= 0) {
                    $qty = 1;
                }

                $unit = isset($it['price']) ? (float)$it['price'] : 0.0;
                $line = isset($it['total_price'])
                    ? (float)$it['total_price']
                    : ($qty * $unit);

                $pages      = isset($it['pages']) ? (int)$it['pages'] : null;
                $totalPages = isset($it['total_pages']) ? (int)$it['total_pages'] : null;

                $stmtItem->execute([
                    $orderId,
                    $name,
                    $qty,
                    $pages,
                    $totalPages,
                    $unit,
                    $line,
                ]);
            }

            $pdo->commit();

            // Load created order + items
            $stmt = $pdo->prepare("
                SELECT
                    id,
                    order_code AS reference,
                    customer_name,
                    total_amount,
                    discount,
                    payment_status,
                    status,
                    created_at,
                    updated_at
                FROM orders
                WHERE id = ?
            ");
            $stmt->execute([$orderId]);
            $order = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($order) {
                $order['id']             = (int)$order['id'];
                $order['total_amount']   = (float)$order['total_amount'];
                $order['discount']       = (float)$order['discount'];
                $order['payment_status'] = $order['payment_status'] ?? 'unpaid';
                $order['status']         = $order['status'] ?? 'pending';

                $temp = [$order];
                attach_items_to_orders($pdo, $temp);
                $order = $temp[0];
            }

            echo json_encode([
                'status'  => 'success',
                'message' => 'Order created',
                'order'   => $order,
            ]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            json_error('Failed to create order: ' . $e->getMessage(), 500);
        }
        break;

    // Update orders
    case 'update':
        $id = isset($input['id']) ? (int)$input['id'] : 0;
        if ($id <= 0) {
            json_error('Invalid order id.');
        }

        $fields = [];
        $params = [];

        if (isset($input['status'])) {
            $fields[] = 'status = ?';
            $params[] = map_status_input($input['status']);
        }
        if (isset($input['payment_status'])) {
            $fields[] = 'payment_status = ?';
            $params[] = map_payment_input($input['payment_status']);
        }

        if (empty($fields)) {
            json_error('No updatable fields provided.');
        }

        $params[] = $id;

        try {
            $sql = 'UPDATE orders SET ' . implode(', ', $fields) . ' WHERE id = ?';
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            // return updated order + items
            $stmt = $pdo->prepare("
                SELECT
                    id,
                    order_code AS reference,
                    customer_name,
                    total_amount,
                    discount,
                    payment_status,
                    status,
                    created_at,
                    updated_at
                FROM orders
                WHERE id = ?
            ");
            $stmt->execute([$id]);
            $order = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$order) {
                json_error('Order not found.', 404);
            }

            $order['id']             = (int)$order['id'];
            $order['total_amount']   = (float)$order['total_amount'];
            $order['discount']       = (float)$order['discount'];
            $order['payment_status'] = $order['payment_status'] ?? 'unpaid';
            $order['status']         = $order['status'] ?? 'pending';

            $temp = [$order];
            attach_items_to_orders($pdo, $temp);
            $order = $temp[0];

            echo json_encode([
                'status'  => 'success',
                'message' => 'Order updated',
                'order'   => $order,
            ]);
        } catch (Throwable $e) {
            json_error('Failed to update order: ' . $e->getMessage(), 500);
        }
        break;

    // Track order
    case 'track':
        $ref = trim($input['reference'] ?? '');
        if ($ref === '') {
            json_error('Missing reference.');
        }

        try {
            if (ctype_digit($ref)) {
                $stmt = $pdo->prepare("
                    SELECT
                        id,
                        order_code AS reference,
                        customer_name,
                        total_amount,
                        discount,
                        payment_status,
                        status,
                        created_at,
                        updated_at
                    FROM orders
                    WHERE id = ?
                ");
                $stmt->execute([(int)$ref]);
            } else {
                $stmt = $pdo->prepare("
                    SELECT
                        id,
                        order_code AS reference,
                        customer_name,
                        total_amount,
                        discount,
                        payment_status,
                        status,
                        created_at,
                        updated_at
                    FROM orders
                    WHERE order_code = ?
                ");
                $stmt->execute([$ref]);
            }

            $order = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$order) {
                json_error('Order not found.', 404);
            }

            $order['id']             = (int)$order['id'];
            $order['total_amount']   = (float)$order['total_amount'];
            $order['discount']       = (float)$order['discount'];
            $order['payment_status'] = $order['payment_status'] ?? 'unpaid';
            $order['status']         = $order['status'] ?? 'pending';

            $temp = [$order];
            attach_items_to_orders($pdo, $temp);
            $order = $temp[0];

            echo json_encode([
                'status' => 'success',
                'order'  => $order,
            ]);
        } catch (Throwable $e) {
            json_error('Failed to track order: ' . $e->getMessage(), 500);
        }
        break;

    default:
        json_error('Unknown action for orders.');
}
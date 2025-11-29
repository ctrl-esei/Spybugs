<?php
require_once __DIR__ . '/../config/config.php';
session_start();
header("Content-Type: application/json");

// admin access
if (!isset($_SESSION['admin_id'])) {
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

function json_error($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(["status" => "error", "message" => $msg]);
    exit;
}

try {

    // return the inventory list
    if ($method === 'GET') {

        $stmt = $pdo->query("
            SELECT 
                id,
                sku,
                name,
                category,
                description,
                stock_quantity,
                reorder_level,
                unit_price,
                is_active,
                created_at,
                updated_at
            FROM inventory
            WHERE is_active = 1
            ORDER BY category, name
        ");

        $inv = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($inv as &$i) {
            $i['id']             = (int)$i['id'];
            $i['stock_quantity'] = (int)$i['stock_quantity'];
            $i['reorder_level']  = (int)$i['reorder_level'];
            $i['unit_price']     = (float)$i['unit_price'];
        }
        unset($i);

        echo json_encode([
            "status"    => "success",
            "inventory" => $inv
        ]);
        exit;
    }

    // All inventory        
    if ($method === 'POST') {
        $data   = json_decode(file_get_contents("php://input"), true) ?? [];
        $action = $data['action'] ?? null;

        if (!$action) {
            json_error("Missing action");
        }

        switch ($action) {

            // adjust quantity
            case 'adjust_quantity':

                $id    = $data['id'] ?? null;
                $delta = isset($data['delta']) ? (int)$data['delta'] : null;

                if (!$id || $delta === null) {
                    json_error("Missing id or delta");
                }

                $stmt = $pdo->prepare("
                    UPDATE inventory
                    SET stock_quantity = GREATEST(0, stock_quantity + ?)
                    WHERE id = ? AND is_active = 1
                ");
                $stmt->execute([$delta, $id]);

                echo json_encode(["status" => "success", "message" => "Quantity adjusted"]);
                exit;

            // create new product for the inventory
            case 'create':

                $name          = trim($data['name'] ?? '');
                $category      = trim($data['category'] ?? '');
                $quantity      = isset($data['quantity']) ? (int)$data['quantity'] : 0;
                $unit_price    = isset($data['unit_price']) ? (float)$data['unit_price'] : 0.0;
                $reorder_level = isset($data['reorder_level']) ? (int)$data['reorder_level'] : 0;

                if ($name === '' || $category === '') {
                    json_error("Name and category are required");
                }

                $sku = $data['sku'] ?? ('SKU-' . strtoupper(bin2hex(random_bytes(4))));

                $stmt = $pdo->prepare("
                    INSERT INTO inventory 
                        (sku, name, category, description, stock_quantity, reorder_level, unit_price, is_active)
                    VALUES 
                        (?, ?, ?, '', ?, ?, ?, 1)
                ");

                $stmt->execute([
                    $sku,
                    $name,
                    $category,
                    $quantity,
                    $reorder_level,
                    $unit_price
                ]);

                $newId = $pdo->lastInsertId();

                $stmt = $pdo->prepare("SELECT * FROM inventory WHERE id = ?");
                $stmt->execute([$newId]);
                $item = $stmt->fetch(PDO::FETCH_ASSOC);

                echo json_encode([
                    "status"  => "success",
                    "message" => "Product created",
                    "item"    => $item
                ]);
                exit;

            case 'update':

                $id            = $data['id'] ?? null;
                $name          = trim($data['name'] ?? '');
                $category      = trim($data['category'] ?? '');
                $quantity      = isset($data['quantity']) ? (int)$data['quantity'] : 0;
                $unit_price    = isset($data['unit_price']) ? (float)$data['unit_price'] : 0.0;
                $reorder_level = isset($data['reorder_level']) ? (int)$data['reorder_level'] : 0;

                if (!$id) {
                    json_error("Missing id for update");
                }
                if ($name === '' || $category === '') {
                    json_error("Name and category are required");
                }

                $stmt = $pdo->prepare("
                    UPDATE inventory
                    SET name = ?, category = ?, stock_quantity = ?, unit_price = ?, reorder_level = ?
                    WHERE id = ? AND is_active = 1
                ");

                $stmt->execute([
                    $name,
                    $category,
                    $quantity,
                    $unit_price,
                    $reorder_level,
                    $id
                ]);

                $stmt = $pdo->prepare("SELECT * FROM inventory WHERE id = ?");
                $stmt->execute([$id]);
                $item = $stmt->fetch(PDO::FETCH_ASSOC);

                echo json_encode([
                    "status"  => "success",
                    "message" => "Product updated",
                    "item"    => $item
                ]);
                exit;

            //delete the product
            case 'delete':

                $id = $data['id'] ?? null;
                if (!$id) {
                    json_error("Missing id for delete");
                }

                $stmt = $pdo->prepare("
                    UPDATE inventory
                    SET is_active = 0
                    WHERE id = ?
                ");
                $stmt->execute([$id]);

                echo json_encode([
                    "status"  => "success",
                    "message" => "Product deleted"
                ]);
                exit;

            default:
                json_error("Unknown action");
        }
    }

    json_error("Invalid request method");

} catch (Exception $e) {
    json_error("Server error: " . $e->getMessage(), 500);
}
<?php
require_once __DIR__ . '/../config/config.php';

header("Content-Type: application/json");
date_default_timezone_set('Asia/Manila');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit;
}

try {
// Date range
    $range     = isset($_GET['range']) ? strtolower(trim($_GET['range'])) : 'all';
    $fromParam = $_GET['from'] ?? null; 
    $toParam   = $_GET['to']   ?? null; 

    $useDateFilter = false;
    $fromDateTime  = null;
    $toDateTime    = null;
    $label         = 'All time';

    $today = new DateTimeImmutable('today');

    switch ($range) {
        case 'today':
            $fromDateTime  = $today->setTime(0, 0, 0);
            $toDateTime    = $fromDateTime->modify('+1 day');
            $useDateFilter = true;
            $label         = 'Today';
            break;

        case 'week':
            // Start of this week (Monday)
            $fromDateTime  = $today->modify('monday this week')->setTime(0, 0, 0);
            $toDateTime    = $fromDateTime->modify('+1 week');
            $useDateFilter = true;
            $label         = 'This week';
            break;

        case 'month':
            // First day of this month
            $fromDateTime  = $today->modify('first day of this month')->setTime(0, 0, 0);
            $toDateTime    = $fromDateTime->modify('+1 month');
            $useDateFilter = true;
            $label         = 'This month';
            break;

        case 'year':
            // First day of this year
            $year          = (int)$today->format('Y');
            $fromDateTime  = (new DateTimeImmutable())->setDate($year, 1, 1)->setTime(0, 0, 0);
            $toDateTime    = $fromDateTime->modify('+1 year');
            $useDateFilter = true;
            $label         = 'This year';
            break;

        case 'custom':
            // Expecting from=YYYY-MM-DD, to=YYYY-MM-DD
            if ($fromParam && $toParam) {
                $fromDateTime = DateTimeImmutable::createFromFormat('Y-m-d', $fromParam);
                $toDateTime   = DateTimeImmutable::createFromFormat('Y-m-d', $toParam);
                if ($fromDateTime && $toDateTime) {
                    $fromDateTime  = $fromDateTime->setTime(0, 0, 0);
                    $toDateTime    = $toDateTime->setTime(23, 59, 59)->modify('+1 second');
                    $useDateFilter = true;
                    $label         = sprintf(
                        'Custom range: %s to %s',
                        $fromDateTime->format('Y-m-d'),
                        $toDateTime->modify('-1 second')->format('Y-m-d')
                    );
                }
            }
            if (!$useDateFilter) {
                $range = 'all';
                $label = 'All time';
            }
            break;

        case 'all':
        default:
            $range = 'all';
            $label = 'All time';
            // no date filter
            break;
    }

    $params = [];
    if ($useDateFilter) {
        $fromStr = $fromDateTime->format('Y-m-d H:i:s');
        $toStr   = $toDateTime->format('Y-m-d H:i:s');
        $params[':from'] = $fromStr;
        $params[':to']   = $toStr;
    } else {
        $fromStr = null;
        $toStr   = null;
    }

    function appendOrdersDateWhere(string $baseWhere, bool $useDateFilter): string
    {
        if (!$useDateFilter) {
            return $baseWhere;
        }
        $clause = "created_at >= :from AND created_at < :to";

        $baseWhere = trim($baseWhere);
        if ($baseWhere === '') {
            return " WHERE $clause";
        }
        return $baseWhere . " AND $clause";
    }

// Total revenue to paid orders only
    $sql = "
        SELECT COALESCE(SUM(total_amount), 0)
        FROM orders
        WHERE payment_status = 'paid'
    ";
    if ($useDateFilter) {
        $sql .= " AND created_at >= :from AND created_at < :to";
    }
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $totalRevenue = (float)$stmt->fetchColumn();

// Total Orders
    $sqlOrders = "SELECT COUNT(*) FROM orders";
    $sqlOrders .= appendOrdersDateWhere('', $useDateFilter);
    $stmt = $pdo->prepare($sqlOrders);
    $stmt->execute($params);
    $totalOrders = (int)$stmt->fetchColumn();

// Total unpaid and pening order
    $sql = "
        SELECT COALESCE(SUM(total_amount), 0)
        FROM orders
        WHERE payment_status = 'unpaid'
    ";
    if ($useDateFilter) {
        $sql .= " AND created_at >= :from AND created_at < :to";
    }
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $pendingPayments = (float)$stmt->fetchColumn();

// Total customer
    $sqlCustomers = "
        SELECT COUNT(DISTINCT customer_name)
        FROM orders
    ";
    $sqlCustomers .= appendOrdersDateWhere('', $useDateFilter);
    $stmt = $pdo->prepare($sqlCustomers);
    $stmt->execute($params);
    $customers = (int)$stmt->fetchColumn();

    $statusCounts = [
        "pending"     => 0,
        "in_progress" => 0,
        "completed"   => 0,
        "cancelled"   => 0,
    ];

    $sqlStatus = "
        SELECT status, COUNT(*) AS cnt
        FROM orders
    ";
    $sqlStatus .= appendOrdersDateWhere('', $useDateFilter);
    $sqlStatus .= " GROUP BY status";

    $stmt = $pdo->prepare($sqlStatus);
    $stmt->execute($params);

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $statusRaw = strtolower(trim($row['status']));

        $map = [
            "pending"     => "pending",
            "in-queue"    => "in_progress",
            "printing"    => "in_progress",
            "ready"       => "in_progress",
            "in_progress" => "in_progress",
            "released"    => "completed",
            "completed"   => "completed",
            "cancelled"   => "cancelled",
        ];

        $mapped = $map[$statusRaw] ?? 'pending';
        if (isset($statusCounts[$mapped])) {
            $statusCounts[$mapped] += (int)$row['cnt'];
        }
    }

// Category Totals
    $categoryTotals = [
        "Print Papers"      => 0,
        "Picture Packages"  => 0,
        "Online Assistance" => 0,
        "Other Services"    => 0,
        "Other"             => 0,
    ];

    $sqlItems = "
        SELECT oi.item_name, SUM(oi.line_total) AS revenue
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.id
    ";
    if ($useDateFilter) {
        $sqlItems .= " WHERE o.created_at >= :from AND o.created_at < :to";
    }
    $sqlItems .= " GROUP BY oi.item_name";

    $stmt = $pdo->prepare($sqlItems);
    $stmt->execute($params);

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $itemName = $row['item_name'] ?? '';
        $name     = strtolower($itemName);
        $amount   = (float)$row['revenue'];

        if (
            strpos($name, 'a4')      !== false ||
            strpos($name, 'a3')      !== false ||
            strpos($name, 'short')   !== false ||
            strpos($name, 'long')    !== false ||
            strpos($name, 'board')   !== false ||
            strpos($name, 'glossy')  !== false ||
            strpos($name, 'sticker') !== false ||
            strpos($name, 'transparent') !== false
        ) {
            $categoryTotals['Print Papers'] += $amount;
            continue;
        }

        if (
            strpos($name, 'package')     !== false ||
            strpos($name, 'wallet')      !== false ||
            strpos($name, '3r')          !== false ||
            strpos($name, '4r')          !== false ||
            strpos($name, '5r')          !== false ||
            strpos($name, '2x2')         !== false ||
            strpos($name, '1x1')         !== false ||
            strpos($name, 'passport')    !== false ||
            strpos($name, 'photo')       !== false
        ) {
            $categoryTotals['Picture Packages'] += $amount;
            continue;
        }

        if (
            strpos($name, 'police clearance') !== false ||
            strpos($name, 'sss')              !== false ||
            strpos($name, 'nbi')              !== false ||
            strpos($name, 'pag-ibig')         !== false ||
            strpos($name, 'pag ibig')         !== false ||
            strpos($name, 'peos')             !== false ||
            strpos($name, 'e-reg')            !== false ||
            strpos($name, 'passport')         !== false ||
            strpos($name, 'psa')              !== false ||
            strpos($name, 'balik-manggagawa') !== false ||
            strpos($name, 'oec')              !== false ||
            strpos($name, 'online')           !== false ||
            strpos($name, 'assist')           !== false
        ) {
            $categoryTotals['Online Assistance'] += $amount;
            continue;
        }

        if (
            strpos($name, 'install') !== false ||
            strpos($name, 'format')  !== false ||
            strpos($name, 'repair')  !== false ||
            strpos($name, 'laminate')!== false ||
            strpos($name, 'resume')  !== false ||
            strpos($name, 'typing')  !== false ||
            strpos($name, 'layout')  !== false ||
            strpos($name, 'service') !== false
        ) {
            $categoryTotals['Other Services'] += $amount;
            continue;
        }

        $categoryTotals['Other'] += $amount;
    }

    echo json_encode([
        "status" => "success",
        "meta"   => [
            "range" => $range,
            "from"  => $fromStr,
            "to"    => $toStr,
            "label" => $label,
        ],
        "analytics" => [
            "totalRevenue"    => $totalRevenue,
            "totalOrders"     => $totalOrders,
            "pendingPayments" => $pendingPayments,
            "customers"       => $customers,
            "statusCounts"    => $statusCounts,
            "categoryTotals"  => $categoryTotals,
        ],
    ]);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "status"  => "error",
        "message" => "Server error while calculating analytics.",
        "error"   => $e->getMessage(),
    ]);
}
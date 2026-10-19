<?php
require_once __DIR__ . '/vendor/autoload.php';

use Dompdf\Dompdf;
use Dompdf\Options;

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET' && $uri === '/health') {
    header('Content-Type: application/json');
    echo json_encode([
        'status' => 'ok',
        'engine' => 'dompdf 2.0.3 + CPDF',
        'service' => 'pdf-dompdf'
    ]);
    exit;
}

if ($method === 'POST' && $uri === '/render') {
    $rawBody = file_get_contents('php://input');
    $html = $rawBody;

    if (str_starts_with(trim($rawBody), '{')) {
        $data = json_decode($rawBody, true);
        if (isset($data['html'])) {
            $html = $data['html'];
        }
    }

    try {
        $options = new Options();
        $options->set('isRemoteEnabled', true);
        $options->set('isHtml5ParserEnabled', true);
        $options->set('defaultFont', 'Helvetica');

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        $pdfOutput = $dompdf->output();

        header('Content-Type: application/pdf');
        header('Content-Disposition: inline; filename="jackal_ticket.pdf"');
        header('Content-Length: ' . strlen($pdfOutput));
        echo $pdfOutput;
        exit;
    } catch (\Throwable $e) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['error' => $e->getMessage()]);
        exit;
    }
}

http_response_code(404);
header('Content-Type: application/json');
echo json_encode(['error' => 'Endpoint not found. Use GET /health or POST /render.']);

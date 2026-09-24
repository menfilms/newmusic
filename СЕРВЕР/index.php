<?php
/**
 * MusicHub - Музыкальный сайт
 * Все в одном файле index.php
 * Хранение данных в JSON
 */

session_start();

// ============ КОНФИГУРАЦИЯ ============
define('ADMIN_PASSWORD', 'admin123');
define('DATA_FILE', __DIR__ . '/data/tracks.json');
define('UPLOAD_DIR', __DIR__ . '/data/uploads/');
define('SITE_NAME', 'MusicHub');

// ============ ИНИЦИАЛИЗАЦИЯ ============
if (!is_dir(__DIR__ . '/data')) mkdir(__DIR__ . '/data', 0755, true);
if (!is_dir(UPLOAD_DIR)) mkdir(UPLOAD_DIR, 0755, true);
if (!file_exists(DATA_FILE)) {
    file_put_contents(DATA_FILE, json_encode([], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

// ============ ФУНКЦИИ ============
function getTracks(): array {
    $data = file_get_contents(DATA_FILE);
    return json_decode($data, true) ?: [];
}

function saveTracks(array $tracks): void {
    file_put_contents(DATA_FILE, json_encode($tracks, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function generateId(): string {
    return bin2hex(random_bytes(8));
}

function isAdmin(): bool {
    return isset($_SESSION['admin']) && $_SESSION['admin'] === true;
}

function jsonResponse(array $data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// ============ API ОБРАБОТКА ============
$action = $_GET['action'] ?? $_POST['action'] ?? '';

// Авторизация
if ($action === 'login') {
    $password = $_POST['password'] ?? '';
    if ($password === ADMIN_PASSWORD) {
        $_SESSION['admin'] = true;
        jsonResponse(['success' => true, 'message' => 'Вход выполнен']);
    } else {
        jsonResponse(['success' => false, 'message' => 'Неверный пароль'], 401);
    }
}

// Выход
if ($action === 'logout') {
    unset($_SESSION['admin']);
    jsonResponse(['success' => true]);
}

// Проверка статуса
if ($action === 'status') {
    jsonResponse(['isAdmin' => isAdmin()]);
}

// Получение треков (публичный)
if ($action === 'get_tracks') {
    jsonResponse(['tracks' => getTracks()]);
}

// Скачивание файла
if ($action === 'download') {
    $id = $_GET['id'] ?? '';
    $tracks = getTracks();
    $track = null;
    foreach ($tracks as $t) {
        if ($t['id'] === $id) { $track = $t; break; }
    }
    if (!$track || !file_exists($track['audioPath'])) {
        http_response_code(404);
        exit('Файл не найден');
    }
    header('Content-Description: File Transfer');
    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="' . $track['artist'] . ' - ' . $track['title'] . '.mp3"');
    header('Content-Length: ' . filesize($track['audioPath']));
    readfile($track['audioPath']);
    exit;
}

// === АДМИН ДЕЙСТВИЯ ===
if (!isAdmin()) {
    if (in_array($action, ['add_track', 'edit_track', 'delete_track'])) {
        jsonResponse(['success' => false, 'message' => 'Требуется авторизация'], 403);
    }
    // Если не админ и не API — показываем страницу
    if ($action !== '') {
        jsonResponse(['success' => false, 'message' => 'Требуется авторизация'], 403);
    }
}

// Добавление трека
if ($action === 'add_track') {
    $title = trim($_POST['title'] ?? '');
    $artist = trim($_POST['artist'] ?? 'Artist');
    $album = trim($_POST['album'] ?? '');
    $type = $_POST['type'] ?? 'single';
    $duration = trim($_POST['duration'] ?? '0:00');
    $releaseDate = $_POST['releaseDate'] ?? date('Y-m-d');

    if (empty($title)) {
        jsonResponse(['success' => false, 'message' => 'Название обязательно'], 400);
    }

    // Загрузка аудио
    $audioPath = '';
    if (isset($_FILES['audio']) && $_FILES['audio']['error'] === UPLOAD_ERR_OK) {
        $ext = pathinfo($_FILES['audio']['name'], PATHINFO_EXTENSION);
        $filename = generateId() . '.' . $ext;
        $audioPath = UPLOAD_DIR . $filename;
        move_uploaded_file($_FILES['audio']['tmp_name'], $audioPath);
    } else {
        $audioUrl = trim($_POST['audioUrl'] ?? '');
        if (!empty($audioUrl)) {
            $audioPath = $audioUrl; // Внешняя ссылка
        } else {
            jsonResponse(['success' => false, 'message' => 'Загрузите аудиофайл или укажите URL'], 400);
        }
    }

    // Загрузка обложки
    $coverPath = '';
    if (isset($_FILES['cover']) && $_FILES['cover']['error'] === UPLOAD_ERR_OK) {
        $ext = pathinfo($_FILES['cover']['name'], PATHINFO_EXTENSION);
        $filename = generateId() . '.' . $ext;
        $coverPath = UPLOAD_DIR . $filename;
        move_uploaded_file($_FILES['cover']['tmp_name'], $coverPath);
    } else {
        $coverUrl = trim($_POST['coverUrl'] ?? '');
        $coverPath = !empty($coverUrl) ? $coverUrl : 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop';
    }

    $track = [
        'id' => generateId(),
        'title' => $title,
        'artist' => $artist,
        'album' => $album,
        'type' => $type,
        'duration' => $duration,
        'releaseDate' => $releaseDate,
        'audioPath' => $audioPath,
        'coverPath' => $coverPath,
        'createdAt' => date('Y-m-d H:i:s')
    ];

    $tracks = getTracks();
    array_unshift($tracks, $track);
    saveTracks($tracks);

    jsonResponse(['success' => true, 'track' => $track]);
}

// Редактирование трека
if ($action === 'edit_track') {
    $id = $_POST['id'] ?? '';
    $tracks = getTracks();
    $found = false;

    foreach ($tracks as &$track) {
        if ($track['id'] === $id) {
            $track['title'] = trim($_POST['title'] ?? $track['title']);
            $track['artist'] = trim($_POST['artist'] ?? $track['artist']);
            $track['album'] = trim($_POST['album'] ?? $track['album']);
            $track['type'] = $_POST['type'] ?? $track['type'];
            $track['duration'] = trim($_POST['duration'] ?? $track['duration']);
            $track['releaseDate'] = $_POST['releaseDate'] ?? $track['releaseDate'];

            // Обновление аудио
            if (isset($_FILES['audio']) && $_FILES['audio']['error'] === UPLOAD_ERR_OK) {
                if (file_exists($track['audioPath']) && !filter_var($track['audioPath'], FILTER_VALIDATE_URL)) {
                    unlink($track['audioPath']);
                }
                $ext = pathinfo($_FILES['audio']['name'], PATHINFO_EXTENSION);
                $filename = generateId() . '.' . $ext;
                $track['audioPath'] = UPLOAD_DIR . $filename;
                move_uploaded_file($_FILES['audio']['tmp_name'], $track['audioPath']);
            } elseif (!empty($_POST['audioUrl'])) {
                $track['audioPath'] = trim($_POST['audioUrl']);
            }

            // Обновление обложки
            if (isset($_FILES['cover']) && $_FILES['cover']['error'] === UPLOAD_ERR_OK) {
                if (file_exists($track['coverPath']) && !filter_var($track['coverPath'], FILTER_VALIDATE_URL)) {
                    unlink($track['coverPath']);
                }
                $ext = pathinfo($_FILES['cover']['name'], PATHINFO_EXTENSION);
                $filename = generateId() . '.' . $ext;
                $track['coverPath'] = UPLOAD_DIR . $filename;
                move_uploaded_file($_FILES['cover']['tmp_name'], $track['coverPath']);
            } elseif (!empty($_POST['coverUrl'])) {
                $track['coverPath'] = trim($_POST['coverUrl']);
            }

            $found = true;
            break;
        }
    }

    if ($found) {
        saveTracks($tracks);
        jsonResponse(['success' => true]);
    } else {
        jsonResponse(['success' => false, 'message' => 'Трек не найден'], 404);
    }
}

// Удаление трека
if ($action === 'delete_track') {
    $id = $_POST['id'] ?? '';
    $tracks = getTracks();
    $newTracks = [];

    foreach ($tracks as $track) {
        if ($track['id'] === $id) {
            if (file_exists($track['audioPath']) && !filter_var($track['audioPath'], FILTER_VALIDATE_URL)) {
                unlink($track['audioPath']);
            }
            if (file_exists($track['coverPath']) && !filter_var($track['coverPath'], FILTER_VALIDATE_URL)) {
                unlink($track['coverPath']);
            }
        } else {
            $newTracks[] = $track;
        }
    }

    saveTracks($newTracks);
    jsonResponse(['success' => true]);
}

// ============ ГЛАВНАЯ СТРАНИЦА ============
$tracks = getTracks();
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= SITE_NAME ?> — Моя Музыка</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        :root {
            --bg-primary: #0a0a0f;
            --bg-secondary: #12121a;
            --bg-card: #1a1a2e;
            --bg-hover: #252540;
            --purple: #8b5cf6;
            --purple-light: #a78bfa;
            --purple-dark: #6d28d9;
            --cyan: #06b6d4;
            --pink: #ec4899;
            --text-primary: #ffffff;
            --text-secondary: #9ca3af;
            --text-muted: #6b7280;
            --border: rgba(139, 92, 246, 0.15);
            --glass: rgba(18, 18, 26, 0.8);
        }

        body {
            font-family: 'Inter', -apple-system, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            min-height: 100vh;
            overflow-x: hidden;
        }

        /* Scrollbar */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 3px; }

        /* Header */
        .header {
            position: sticky;
            top: 0;
            z-index: 100;
            background: rgba(10, 10, 15, 0.85);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid var(--border);
        }

        .header-inner {
            max-width: 1400px;
            margin: 0 auto;
            padding: 16px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .logo {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .logo-icon {
            width: 42px;
            height: 42px;
            background: linear-gradient(135deg, var(--purple), var(--cyan));
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
        }

        .logo-icon svg { width: 24px; height: 24px; fill: white; }

        .logo-text {
            font-size: 22px;
            font-weight: 800;
            background: linear-gradient(135deg, var(--purple-light), var(--cyan));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .header-actions {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .search-box {
            position: relative;
            display: none;
        }

        @media (min-width: 768px) {
            .search-box { display: block; }
        }

        .search-box input {
            background: rgba(26, 26, 46, 0.6);
            border: 1px solid var(--border);
            border-radius: 50px;
            padding: 10px 16px 10px 40px;
            color: white;
            font-size: 14px;
            width: 260px;
            transition: all 0.3s;
        }

        .search-box input:focus {
            outline: none;
            border-color: var(--purple);
            box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
        }

        .search-box svg {
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            width: 16px;
            height: 16px;
            fill: var(--text-muted);
        }

        .btn {
            padding: 10px 20px;
            border-radius: 50px;
            font-size: 14px;
            font-weight: 500;
            border: none;
            cursor: pointer;
            transition: all 0.3s;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }

        .btn-primary {
            background: linear-gradient(135deg, var(--purple), var(--purple-dark));
            color: white;
            box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
        }

        .btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
        }

        .btn-ghost {
            background: rgba(26, 26, 46, 0.6);
            border: 1px solid var(--border);
            color: var(--text-secondary);
        }

        .btn-ghost:hover {
            background: var(--bg-hover);
            color: white;
        }

        .btn-danger {
            background: rgba(239, 68, 68, 0.2);
            color: #ef4444;
            border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .btn-danger:hover {
            background: rgba(239, 68, 68, 0.3);
        }

        /* Hero */
        .hero {
            position: relative;
            overflow: hidden;
            padding: 80px 24px;
            text-align: center;
        }

        .hero::before {
            content: '';
            position: absolute;
            top: -50%;
            left: 20%;
            width: 500px;
            height: 500px;
            background: radial-gradient(circle, rgba(139, 92, 246, 0.15), transparent 70%);
            border-radius: 50%;
            animation: float 8s ease-in-out infinite;
        }

        .hero::after {
            content: '';
            position: absolute;
            top: 20%;
            right: 15%;
            width: 350px;
            height: 350px;
            background: radial-gradient(circle, rgba(6, 182, 212, 0.1), transparent 70%);
            border-radius: 50%;
            animation: float 6s ease-in-out infinite reverse;
        }

        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-30px); }
        }

        .hero h1 {
            font-size: clamp(36px, 6vw, 64px);
            font-weight: 800;
            background: linear-gradient(135deg, var(--purple-light), var(--pink), var(--cyan));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 16px;
            position: relative;
            z-index: 1;
        }

        .hero p {
            color: var(--text-secondary);
            font-size: 18px;
            max-width: 600px;
            margin: 0 auto;
            position: relative;
            z-index: 1;
        }

        /* Filters */
        .filters {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 24px 32px;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            align-items: center;
        }

        .filter-btn {
            padding: 8px 18px;
            border-radius: 50px;
            font-size: 13px;
            font-weight: 500;
            border: 1px solid var(--border);
            background: rgba(26, 26, 46, 0.4);
            color: var(--text-secondary);
            cursor: pointer;
            transition: all 0.3s;
        }

        .filter-btn:hover {
            border-color: var(--purple);
            color: white;
        }

        .filter-btn.active {
            background: var(--purple);
            border-color: var(--purple);
            color: white;
            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }

        /* Track Grid */
        .tracks-grid {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 24px 120px;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 20px;
        }

        .track-card {
            background: var(--bg-card);
            border-radius: 16px;
            overflow: hidden;
            border: 1px solid var(--border);
            transition: all 0.3s;
            cursor: pointer;
        }

        .track-card:hover {
            transform: translateY(-4px);
            border-color: rgba(139, 92, 246, 0.4);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3), 0 0 30px rgba(139, 92, 246, 0.1);
        }

        .track-card.playing {
            border-color: var(--purple);
            box-shadow: 0 0 30px rgba(139, 92, 246, 0.2);
        }

        .track-cover {
            position: relative;
            aspect-ratio: 1;
            overflow: hidden;
        }

        .track-cover img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.5s;
        }

        .track-card:hover .track-cover img {
            transform: scale(1.08);
        }

        .track-overlay {
            position: absolute;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.3s;
        }

        .track-card:hover .track-overlay {
            opacity: 1;
        }

        .play-btn {
            width: 56px;
            height: 56px;
            background: var(--purple);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 8px 25px rgba(139, 92, 246, 0.5);
            transition: transform 0.2s;
        }

        .play-btn:hover {
            transform: scale(1.1);
        }

        .play-btn svg {
            width: 24px;
            height: 24px;
            fill: white;
        }

        .track-badge {
            position: absolute;
            top: 12px;
            right: 12px;
            padding: 4px 10px;
            border-radius: 50px;
            font-size: 11px;
            font-weight: 600;
            backdrop-filter: blur(10px);
        }

        .badge-single { background: rgba(59, 130, 246, 0.8); color: white; }
        .badge-album { background: rgba(34, 197, 94, 0.8); color: white; }
        .badge-release { background: rgba(249, 115, 22, 0.8); color: white; }

        .playing-indicator {
            position: absolute;
            bottom: 12px;
            left: 12px;
            display: flex;
            align-items: flex-end;
            gap: 2px;
            height: 16px;
        }

        .playing-indicator span {
            width: 3px;
            background: var(--purple-light);
            border-radius: 2px;
            animation: eq 0.8s ease-in-out infinite;
        }

        .playing-indicator span:nth-child(1) { height: 60%; animation-delay: 0ms; }
        .playing-indicator span:nth-child(2) { height: 100%; animation-delay: 150ms; }
        .playing-indicator span:nth-child(3) { height: 40%; animation-delay: 300ms; }
        .playing-indicator span:nth-child(4) { height: 80%; animation-delay: 450ms; }

        @keyframes eq {
            0%, 100% { transform: scaleY(0.3); }
            50% { transform: scaleY(1); }
        }

        .track-info {
            padding: 16px;
        }

        .track-title {
            font-size: 15px;
            font-weight: 600;
            color: white;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .track-artist {
            font-size: 13px;
            color: var(--text-secondary);
            margin-top: 4px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .track-meta {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: 12px;
        }

        .track-duration {
            font-size: 12px;
            color: var(--text-muted);
        }

        .track-actions {
            display: flex;
            gap: 4px;
        }

        .track-action-btn {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            transition: all 0.2s;
        }

        .track-action-btn:hover {
            background: var(--bg-hover);
            color: var(--purple-light);
        }

        .track-action-btn svg {
            width: 16px;
            height: 16px;
            fill: currentColor;
        }

        /* Player */
        .player {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 200;
            background: rgba(10, 10, 15, 0.95);
            backdrop-filter: blur(20px);
            border-top: 1px solid var(--border);
            transform: translateY(100%);
            transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .player.active {
            transform: translateY(0);
        }

        .player-progress {
            padding: 8px 24px 0;
        }

        .progress-bar {
            width: 100%;
            height: 4px;
            background: rgba(75, 85, 99, 0.5);
            border-radius: 2px;
            cursor: pointer;
            position: relative;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, var(--purple), var(--cyan));
            border-radius: 2px;
            transition: width 0.1s linear;
            position: relative;
        }

        .progress-fill::after {
            content: '';
            position: absolute;
            right: -5px;
            top: 50%;
            transform: translateY(-50%);
            width: 10px;
            height: 10px;
            background: white;
            border-radius: 50%;
            opacity: 0;
            transition: opacity 0.2s;
        }

        .progress-bar:hover .progress-fill::after {
            opacity: 1;
        }

        .player-times {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: var(--text-muted);
            margin-top: 4px;
        }

        .player-inner {
            display: flex;
            align-items: center;
            padding: 12px 24px 16px;
            gap: 16px;
        }

        .player-track-info {
            display: flex;
            align-items: center;
            gap: 12px;
            flex: 1;
            min-width: 0;
        }

        .player-cover {
            width: 48px;
            height: 48px;
            border-radius: 10px;
            object-fit: cover;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .player-title {
            font-size: 14px;
            font-weight: 600;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .player-artist {
            font-size: 12px;
            color: var(--text-secondary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .player-controls {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .ctrl-btn {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            transition: all 0.2s;
        }

        .ctrl-btn:hover {
            color: white;
            background: rgba(139, 92, 246, 0.1);
        }

        .ctrl-btn svg {
            width: 20px;
            height: 20px;
            fill: currentColor;
        }

        .ctrl-play {
            width: 44px;
            height: 44px;
            background: var(--purple);
            color: white;
            box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
        }

        .ctrl-play:hover {
            background: var(--purple-light);
            transform: scale(1.05);
        }

        .ctrl-play svg {
            width: 22px;
            height: 22px;
        }

        .player-volume {
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 1;
            justify-content: flex-end;
        }

        .volume-slider {
            width: 80px;
            height: 4px;
            -webkit-appearance: none;
            appearance: none;
            background: rgba(75, 85, 99, 0.5);
            border-radius: 2px;
            outline: none;
            cursor: pointer;
        }

        .volume-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 12px;
            height: 12px;
            background: white;
            border-radius: 50%;
            cursor: pointer;
        }

        /* Modal */
        .modal-overlay {
            position: fixed;
            inset: 0;
            z-index: 300;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s;
        }

        .modal-overlay.active {
            opacity: 1;
            visibility: visible;
        }

        .modal {
            background: var(--bg-secondary);
            border-radius: 20px;
            border: 1px solid var(--border);
            width: 100%;
            max-width: 500px;
            max-height: 90vh;
            overflow-y: auto;
            transform: scale(0.9);
            transition: transform 0.3s;
        }

        .modal-overlay.active .modal {
            transform: scale(1);
        }

        .modal-header {
            padding: 24px 24px 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .modal-header h2 {
            font-size: 20px;
            font-weight: 700;
        }

        .modal-close {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            transition: all 0.2s;
        }

        .modal-close:hover {
            background: var(--bg-hover);
            color: white;
        }

        .modal-body {
            padding: 24px;
        }

        .form-group {
            margin-bottom: 16px;
        }

        .form-group label {
            display: block;
            font-size: 13px;
            color: var(--text-secondary);
            margin-bottom: 6px;
            font-weight: 500;
        }

        .form-input {
            width: 100%;
            padding: 12px 16px;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 12px;
            color: white;
            font-size: 14px;
            transition: all 0.2s;
        }

        .form-input:focus {
            outline: none;
            border-color: var(--purple);
            box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
        }

        .form-input::placeholder {
            color: var(--text-muted);
        }

        select.form-input {
            cursor: pointer;
        }

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }

        /* Admin Panel */
        .admin-panel {
            max-width: 900px;
        }

        .admin-panel .modal {
            max-width: 900px;
        }

        .admin-track-list {
            margin-top: 20px;
        }

        .admin-track-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            background: var(--bg-card);
            border-radius: 12px;
            margin-bottom: 8px;
            border: 1px solid var(--border);
            transition: all 0.2s;
        }

        .admin-track-item:hover {
            border-color: rgba(139, 92, 246, 0.3);
        }

        .admin-track-item img {
            width: 44px;
            height: 44px;
            border-radius: 8px;
            object-fit: cover;
        }

        .admin-track-item .info {
            flex: 1;
            min-width: 0;
        }

        .admin-track-item .info h4 {
            font-size: 14px;
            font-weight: 600;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .admin-track-item .info p {
            font-size: 12px;
            color: var(--text-secondary);
        }

        .admin-actions {
            display: flex;
            gap: 4px;
        }

        .admin-btn {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            transition: all 0.2s;
        }

        .admin-btn:hover {
            background: var(--bg-hover);
        }

        .admin-btn.edit:hover { color: #3b82f6; }
        .admin-btn.delete:hover { color: #ef4444; }

        .admin-btn svg {
            width: 16px;
            height: 16px;
            fill: currentColor;
        }

        /* Toast */
        .toast {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 400;
            padding: 14px 20px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 500;
            transform: translateX(120%);
            transition: transform 0.3s;
            max-width: 350px;
        }

        .toast.show {
            transform: translateX(0);
        }

        .toast-success {
            background: rgba(34, 197, 94, 0.15);
            border: 1px solid rgba(34, 197, 94, 0.3);
            color: #4ade80;
        }

        .toast-error {
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #f87171;
        }

        /* Empty state */
        .empty-state {
            text-align: center;
            padding: 80px 24px;
            grid-column: 1 / -1;
        }

        .empty-state .emoji {
            font-size: 64px;
            margin-bottom: 16px;
        }

        .empty-state h3 {
            font-size: 20px;
            color: var(--text-secondary);
        }

        .empty-state p {
            color: var(--text-muted);
            margin-top: 8px;
        }

        /* Mobile search */
        .mobile-search {
            padding: 0 24px 16px;
            display: block;
        }

        @media (min-width: 768px) {
            .mobile-search { display: none; }
        }

        .mobile-search input {
            width: 100%;
            padding: 12px 16px 12px 40px;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 12px;
            color: white;
            font-size: 14px;
        }

        .mobile-search input:focus {
            outline: none;
            border-color: var(--purple);
        }

        .mobile-search-wrap {
            position: relative;
        }

        .mobile-search-wrap svg {
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            width: 16px;
            height: 16px;
            fill: var(--text-muted);
        }

        /* File input styling */
        .file-input-wrap {
            position: relative;
        }

        .file-input-wrap input[type="file"] {
            width: 100%;
            padding: 10px;
            background: var(--bg-card);
            border: 1px dashed var(--border);
            border-radius: 12px;
            color: var(--text-secondary);
            font-size: 13px;
            cursor: pointer;
        }

        .file-input-wrap input[type="file"]::-webkit-file-upload-button {
            background: var(--purple);
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 12px;
            cursor: pointer;
            margin-right: 10px;
        }
    </style>
</head>
<body>
    <!-- Header -->
    <header class="header">
        <div class="header-inner">
            <div class="logo">
                <div class="logo-icon">
                    <svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                </div>
                <span class="logo-text"><?= SITE_NAME ?></span>
            </div>
            <div class="header-actions">
                <div class="search-box">
                    <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                    <input type="text" id="searchInput" placeholder="Поиск треков..." oninput="filterTracks()">
                </div>
                <button class="btn btn-ghost" onclick="openAdminModal()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
                    <span>Админ</span>
                </button>
            </div>
        </div>
    </header>

    <!-- Hero -->
    <section class="hero">
        <h1>Моя Музыка</h1>
        <p>Слушайте мои треки, альбомы и синглы. Наслаждайтесь каждым звуком 🎧</p>
    </section>

    <!-- Mobile Search -->
    <div class="mobile-search">
        <div class="mobile-search-wrap">
            <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            <input type="text" id="mobileSearchInput" placeholder="Поиск треков..." oninput="filterTracks()">
        </div>
    </div>

    <!-- Filters -->
    <div class="filters">
        <button class="filter-btn active" data-filter="all" onclick="setFilter('all', this)">Все</button>
        <button class="filter-btn" data-filter="album" onclick="setFilter('album', this)">🎵 Альбомы</button>
        <button class="filter-btn" data-filter="single" onclick="setFilter('single', this)">💿 Синглы</button>
        <button class="filter-btn" data-filter="release" onclick="setFilter('release', this)">🔥 Релизы</button>
    </div>

    <!-- Tracks Grid -->
    <div class="tracks-grid" id="tracksGrid">
        <?php if (empty($tracks)): ?>
            <div class="empty-state">
                <div class="emoji">🎵</div>
                <h3>Пока нет треков</h3>
                <p>Добавьте первый трек через админ-панель</p>
            </div>
        <?php else: ?>
            <?php foreach ($tracks as $track): ?>
                <?php
                    $coverSrc = $track['coverPath'];
                    if (!filter_var($coverSrc, FILTER_VALIDATE_URL) && file_exists($coverSrc)) {
                        $coverSrc = 'data/uploads/' . basename($coverSrc);
                    }
                    $audioSrc = $track['audioPath'];
                    if (!filter_var($audioSrc, FILTER_VALIDATE_URL) && file_exists($audioSrc)) {
                        $audioSrc = 'data/uploads/' . basename($audioSrc);
                    }
                    $badgeClass = $track['type'] === 'single' ? 'badge-single' : ($track['type'] === 'album' ? 'badge-album' : 'badge-release');
                    $typeLabel = $track['type'] === 'single' ? 'Сингл' : ($track['type'] === 'album' ? 'Альбом' : 'Релиз');
                ?>
                <div class="track-card" data-id="<?= htmlspecialchars($track['id']) ?>" 
                     data-type="<?= htmlspecialchars($track['type']) ?>"
                     data-title="<?= htmlspecialchars(strtolower($track['title'])) ?>"
                     data-artist="<?= htmlspecialchars(strtolower($track['artist'])) ?>"
                     data-album="<?= htmlspecialchars(strtolower($track['album'])) ?>"
                     data-audio="<?= htmlspecialchars($audioSrc) ?>"
                     data-cover="<?= htmlspecialchars($coverSrc) ?>">
                    <div class="track-cover">
                        <img src="<?= htmlspecialchars($coverSrc) ?>" alt="<?= htmlspecialchars($track['title']) ?>">
                        <div class="track-overlay">
                            <div class="play-btn" onclick="playTrack('<?= htmlspecialchars($track['id']) ?>')">
                                <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                            </div>
                        </div>
                        <span class="track-badge <?= $badgeClass ?>"><?= $typeLabel ?></span>
                        <div class="playing-indicator" id="indicator-<?= htmlspecialchars($track['id']) ?>" style="display:none">
                            <span></span><span></span><span></span><span></span>
                        </div>
                    </div>
                    <div class="track-info">
                        <div class="track-title"><?= htmlspecialchars($track['title']) ?></div>
                        <div class="track-artist"><?= htmlspecialchars($track['artist']) ?> • <?= htmlspecialchars($track['album']) ?></div>
                        <div class="track-meta">
                            <span class="track-duration"><?= htmlspecialchars($track['duration']) ?> • <?= htmlspecialchars($track['releaseDate']) ?></span>
                            <div class="track-actions">
                                <button class="track-action-btn" onclick="downloadTrack('<?= htmlspecialchars($track['id']) ?>')" title="Скачать">
                                    <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                                </button>
                                <button class="track-action-btn" onclick="playTrack('<?= htmlspecialchars($track['id']) ?>')" title="Играть">
                                    <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>
        <?php endif; ?>
    </div>

    <!-- Player -->
    <div class="player" id="player">
        <div class="player-progress">
            <div class="progress-bar" id="progressBar" onclick="seekAudio(event)">
                <div class="progress-fill" id="progressFill" style="width: 0%"></div>
            </div>
            <div class="player-times">
                <span id="currentTime">0:00</span>
                <span id="totalTime">0:00</span>
            </div>
        </div>
        <div class="player-inner">
            <div class="player-track-info">
                <img class="player-cover" id="playerCover" src="" alt="">
                <div>
                    <div class="player-title" id="playerTitle">-</div>
                    <div class="player-artist" id="playerArtist">-</div>
                </div>
            </div>
            <div class="player-controls">
                <button class="ctrl-btn" onclick="prevTrack()">
                    <svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
                </button>
                <button class="ctrl-btn ctrl-play" id="playPauseBtn" onclick="togglePlay()">
                    <svg viewBox="0 0 24 24" id="playIcon"><path d="M8 5v14l11-7z"/></svg>
                </button>
                <button class="ctrl-btn" onclick="nextTrack()">
                    <svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
                </button>
                <button class="ctrl-btn" onclick="downloadCurrent()" title="Скачать">
                    <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                </button>
            </div>
            <div class="player-volume">
                <button class="ctrl-btn" onclick="toggleMute()">
                    <svg viewBox="0 0 24 24" id="volumeIcon"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                </button>
                <input type="range" class="volume-slider" id="volumeSlider" min="0" max="1" step="0.01" value="0.8" oninput="setVolume(this.value)">
            </div>
        </div>
    </div>

    <!-- Audio Element -->
    <audio id="audioPlayer"></audio>

    <!-- Login Modal -->
    <div class="modal-overlay" id="loginModal">
        <div class="modal">
            <div class="modal-header">
                <h2>🔐 Вход в админ-панель</h2>
                <button class="modal-close" onclick="closeModal('loginModal')">✕</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Пароль</label>
                    <input type="password" class="form-input" id="loginPassword" placeholder="Введите пароль" onkeydown="if(event.key==='Enter')doLogin()">
                </div>
                <button class="btn btn-primary" style="width:100%" onclick="doLogin()">Войти</button>
                <p style="text-align:center;margin-top:12px;font-size:12px;color:var(--text-muted)">Пароль по умолчанию: admin123</p>
            </div>
        </div>
    </div>

    <!-- Admin Modal -->
    <div class="modal-overlay admin-panel" id="adminModal">
        <div class="modal">
            <div class="modal-header">
                <h2>🎛️ Админ-панель</h2>
                <button class="modal-close" onclick="closeModal('adminModal')">✕</button>
            </div>
            <div class="modal-body">
                <!-- Add Track Form -->
                <div style="background:var(--bg-card);border-radius:14px;padding:20px;border:1px solid var(--border);margin-bottom:20px">
                    <h3 style="margin-bottom:16px;font-size:16px" id="formTitle">➕ Добавить трек</h3>
                    <input type="hidden" id="editTrackId" value="">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Название *</label>
                            <input type="text" class="form-input" id="trackTitle" placeholder="Название трека">
                        </div>
                        <div class="form-group">
                            <label>Артист</label>
                            <input type="text" class="form-input" id="trackArtist" placeholder="Имя артиста" value="Artist">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Альбом</label>
                            <input type="text" class="form-input" id="trackAlbum" placeholder="Название альбома">
                        </div>
                        <div class="form-group">
                            <label>Тип</label>
                            <select class="form-input" id="trackType">
                                <option value="single">Сингл</option>
                                <option value="album">Альбом</option>
                                <option value="release">Релиз</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Длительность</label>
                            <input type="text" class="form-input" id="trackDuration" placeholder="3:45">
                        </div>
                        <div class="form-group">
                            <label>Дата релиза</label>
                            <input type="date" class="form-input" id="trackDate" value="<?= date('Y-m-d') ?>">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Аудиофайл *</label>
                        <div class="file-input-wrap">
                            <input type="file" id="trackAudio" accept="audio/*">
                        </div>
                        <p style="font-size:11px;color:var(--text-muted);margin-top:4px">или укажите URL ниже</p>
                        <input type="text" class="form-input" id="trackAudioUrl" placeholder="https://example.com/track.mp3" style="margin-top:8px">
                    </div>
                    <div class="form-group">
                        <label>Обложка</label>
                        <div class="file-input-wrap">
                            <input type="file" id="trackCover" accept="image/*">
                        </div>
                        <p style="font-size:11px;color:var(--text-muted);margin-top:4px">или укажите URL ниже</p>
                        <input type="text" class="form-input" id="trackCoverUrl" placeholder="https://example.com/cover.jpg" style="margin-top:8px">
                    </div>
                    <div style="display:flex;gap:8px;margin-top:16px">
                        <button class="btn btn-primary" onclick="submitTrack()" id="submitBtn">Добавить</button>
                        <button class="btn btn-ghost" onclick="resetForm()" id="cancelEditBtn" style="display:none">Отмена</button>
                        <button class="btn btn-danger" onclick="doLogout()" style="margin-left:auto">Выйти</button>
                    </div>
                </div>

                <!-- Track List -->
                <h3 style="margin-bottom:12px;font-size:16px">📋 Управление треками (<?= count($tracks) ?>)</h3>
                <div class="admin-track-list" id="adminTrackList">
                    <?php foreach ($tracks as $track): ?>
                        <?php
                            $coverSrc = $track['coverPath'];
                            if (!filter_var($coverSrc, FILTER_VALIDATE_URL) && file_exists($coverSrc)) {
                                $coverSrc = 'data/uploads/' . basename($coverSrc);
                            }
                        ?>
                        <div class="admin-track-item" data-admin-id="<?= htmlspecialchars($track['id']) ?>">
                            <img src="<?= htmlspecialchars($coverSrc) ?>" alt="">
                            <div class="info">
                                <h4><?= htmlspecialchars($track['title']) ?></h4>
                                <p><?= htmlspecialchars($track['artist']) ?> • <?= htmlspecialchars($track['album']) ?></p>
                            </div>
                            <div class="admin-actions">
                                <button class="admin-btn edit" onclick="editTrack('<?= htmlspecialchars($track['id']) ?>')" title="Редактировать">
                                    <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                                </button>
                                <button class="admin-btn delete" onclick="deleteTrack('<?= htmlspecialchars($track['id']) ?>')" title="Удалить">
                                    <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                                </button>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>
        </div>
    </div>

    <!-- Toast -->
    <div class="toast" id="toast"></div>

    <script>
        // ============ STATE ============
        let currentTrackId = null;
        let isPlaying = false;
        let currentFilter = 'all';
        const audio = document.getElementById('audioPlayer');
        
        // Track data from PHP
        const tracksData = <?= json_encode($tracks, JSON_UNESCAPED_UNICODE) ?>;

        // ============ PLAYER ============
        function playTrack(id) {
            const track = tracksData.find(t => t.id === id);
            if (!track) return;

            let audioSrc = track.audioPath;
            let coverSrc = track.coverPath;
            
            // Fix paths for local files
            const card = document.querySelector(`.track-card[data-id="${id}"]`);
            if (card) {
                audioSrc = card.dataset.audio;
                coverSrc = card.dataset.cover;
            }

            if (currentTrackId === id) {
                togglePlay();
                return;
            }

            currentTrackId = id;
            audio.src = audioSrc;
            audio.play().catch(e => console.log('Play error:', e));
            isPlaying = true;

            // Update UI
            document.getElementById('player').classList.add('active');
            document.getElementById('playerTitle').textContent = track.title;
            document.getElementById('playerArtist').textContent = track.artist + ' • ' + track.album;
            document.getElementById('playerCover').src = coverSrc;
            updatePlayButton();
            updatePlayingIndicators();
            highlightCard(id);
        }

        function togglePlay() {
            if (!currentTrackId) return;
            if (isPlaying) {
                audio.pause();
                isPlaying = false;
            } else {
                audio.play().catch(e => console.log('Play error:', e));
                isPlaying = true;
            }
            updatePlayButton();
            updatePlayingIndicators();
        }

        function updatePlayButton() {
            const icon = document.getElementById('playIcon');
            if (isPlaying) {
                icon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
            } else {
                icon.innerHTML = '<path d="M8 5v14l11-7z"/>';
            }
        }

        function updatePlayingIndicators() {
            document.querySelectorAll('.playing-indicator').forEach(el => {
                el.style.display = 'none';
            });
            if (isPlaying && currentTrackId) {
                const indicator = document.getElementById('indicator-' + currentTrackId);
                if (indicator) indicator.style.display = 'flex';
            }
        }

        function highlightCard(id) {
            document.querySelectorAll('.track-card').forEach(card => {
                card.classList.remove('playing');
            });
            const card = document.querySelector(`.track-card[data-id="${id}"]`);
            if (card) card.classList.add('playing');
        }

        function prevTrack() {
            if (!currentTrackId) return;
            const idx = tracksData.findIndex(t => t.id === currentTrackId);
            const prevIdx = (idx - 1 + tracksData.length) % tracksData.length;
            playTrack(tracksData[prevIdx].id);
        }

        function nextTrack() {
            if (!currentTrackId) return;
            const idx = tracksData.findIndex(t => t.id === currentTrackId);
            const nextIdx = (idx + 1) % tracksData.length;
            playTrack(tracksData[nextIdx].id);
        }

        function seekAudio(e) {
            const bar = document.getElementById('progressBar');
            const rect = bar.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            if (audio.duration) {
                audio.currentTime = percent * audio.duration;
            }
        }

        function setVolume(val) {
            audio.volume = val;
        }

        function toggleMute() {
            audio.muted = !audio.muted;
            const icon = document.getElementById('volumeIcon');
            if (audio.muted) {
                icon.innerHTML = '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>';
            } else {
                icon.innerHTML = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';
            }
        }

        function downloadCurrent() {
            if (currentTrackId) downloadTrack(currentTrackId);
        }

        function formatTime(sec) {
            if (isNaN(sec)) return '0:00';
            const m = Math.floor(sec / 60);
            const s = Math.floor(sec % 60);
            return m + ':' + s.toString().padStart(2, '0');
        }

        // Audio events
        audio.addEventListener('timeupdate', () => {
            if (audio.duration) {
                const percent = (audio.currentTime / audio.duration) * 100;
                document.getElementById('progressFill').style.width = percent + '%';
                document.getElementById('currentTime').textContent = formatTime(audio.currentTime);
                document.getElementById('totalTime').textContent = formatTime(audio.duration);
            }
        });

        audio.addEventListener('ended', () => {
            nextTrack();
        });

        audio.addEventListener('play', () => {
            isPlaying = true;
            updatePlayButton();
            updatePlayingIndicators();
        });

        audio.addEventListener('pause', () => {
            isPlaying = false;
            updatePlayButton();
            updatePlayingIndicators();
        });

        // ============ DOWNLOAD ============
        function downloadTrack(id) {
            window.location.href = '?action=download&id=' + id;
        }

        // ============ FILTERS ============
        function setFilter(filter, btn) {
            currentFilter = filter;
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterTracks();
        }

        function filterTracks() {
            const search = (document.getElementById('searchInput').value || document.getElementById('mobileSearchInput').value || '').toLowerCase();
            document.querySelectorAll('.track-card').forEach(card => {
                const type = card.dataset.type;
                const title = card.dataset.title;
                const artist = card.dataset.artist;
                const album = card.dataset.album;
                
                const matchesFilter = currentFilter === 'all' || type === currentFilter;
                const matchesSearch = !search || title.includes(search) || artist.includes(search) || album.includes(search);
                
                card.style.display = (matchesFilter && matchesSearch) ? '' : 'none';
            });
        }

        // ============ ADMIN ============
        let isAdminLoggedIn = false;

        function openAdminModal() {
            if (isAdminLoggedIn) {
                document.getElementById('adminModal').classList.add('active');
            } else {
                document.getElementById('loginModal').classList.add('active');
            }
        }

        function closeModal(id) {
            document.getElementById(id).classList.remove('active');
        }

        function doLogin() {
            const password = document.getElementById('loginPassword').value;
            fetch('?action=login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'password=' + encodeURIComponent(password)
            })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    isAdminLoggedIn = true;
                    closeModal('loginModal');
                    document.getElementById('adminModal').classList.add('active');
                    showToast('Вход выполнен!', 'success');
                } else {
                    showToast(data.message || 'Ошибка входа', 'error');
                }
            })
            .catch(() => showToast('Ошибка соединения', 'error'));
        }

        function doLogout() {
            fetch('?action=logout')
            .then(r => r.json())
            .then(() => {
                isAdminLoggedIn = false;
                closeModal('adminModal');
                showToast('Вы вышли из системы', 'success');
            });
        }

        function submitTrack() {
            const editId = document.getElementById('editTrackId').value;
            const formData = new FormData();
            
            formData.append('action', editId ? 'edit_track' : 'add_track');
            if (editId) formData.append('id', editId);
            formData.append('title', document.getElementById('trackTitle').value);
            formData.append('artist', document.getElementById('trackArtist').value);
            formData.append('album', document.getElementById('trackAlbum').value);
            formData.append('type', document.getElementById('trackType').value);
            formData.append('duration', document.getElementById('trackDuration').value);
            formData.append('releaseDate', document.getElementById('trackDate').value);
            formData.append('audioUrl', document.getElementById('trackAudioUrl').value);
            formData.append('coverUrl', document.getElementById('trackCoverUrl').value);

            const audioFile = document.getElementById('trackAudio').files[0];
            const coverFile = document.getElementById('trackCover').files[0];
            if (audioFile) formData.append('audio', audioFile);
            if (coverFile) formData.append('cover', coverFile);

            fetch('', { method: 'POST', body: formData })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    showToast(editId ? 'Трек обновлён!' : 'Трек добавлен!', 'success');
                    resetForm();
                    setTimeout(() => location.reload(), 800);
                } else {
                    showToast(data.message || 'Ошибка', 'error');
                }
            })
            .catch(() => showToast('Ошибка соединения', 'error'));
        }

        function editTrack(id) {
            const track = tracksData.find(t => t.id === id);
            if (!track) return;

            document.getElementById('editTrackId').value = id;
            document.getElementById('trackTitle').value = track.title;
            document.getElementById('trackArtist').value = track.artist;
            document.getElementById('trackAlbum').value = track.album;
            document.getElementById('trackType').value = track.type;
            document.getElementById('trackDuration').value = track.duration;
            document.getElementById('trackDate').value = track.releaseDate;
            document.getElementById('formTitle').textContent = '✏️ Редактировать трек';
            document.getElementById('submitBtn').textContent = 'Сохранить';
            document.getElementById('cancelEditBtn').style.display = 'inline-flex';

            // Scroll to form
            document.getElementById('formTitle').scrollIntoView({ behavior: 'smooth' });
        }

        function deleteTrack(id) {
            if (!confirm('Удалить этот трек?')) return;
            
            const formData = new FormData();
            formData.append('action', 'delete_track');
            formData.append('id', id);

            fetch('', { method: 'POST', body: formData })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    showToast('Трек удалён', 'success');
                    setTimeout(() => location.reload(), 800);
                } else {
                    showToast(data.message || 'Ошибка', 'error');
                }
            });
        }

        function resetForm() {
            document.getElementById('editTrackId').value = '';
            document.getElementById('trackTitle').value = '';
            document.getElementById('trackArtist').value = 'Artist';
            document.getElementById('trackAlbum').value = '';
            document.getElementById('trackType').value = 'single';
            document.getElementById('trackDuration').value = '';
            document.getElementById('trackDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('trackAudio').value = '';
            document.getElementById('trackCover').value = '';
            document.getElementById('trackAudioUrl').value = '';
            document.getElementById('trackCoverUrl').value = '';
            document.getElementById('formTitle').textContent = '➕ Добавить трек';
            document.getElementById('submitBtn').textContent = 'Добавить';
            document.getElementById('cancelEditBtn').style.display = 'none';
        }

        // ============ TOAST ============
        function showToast(message, type = 'success') {
            const toast = document.getElementById('toast');
            toast.textContent = message;
            toast.className = 'toast toast-' + type + ' show';
            setTimeout(() => toast.classList.remove('show'), 3000);
        }

        // ============ INIT ============
        audio.volume = 0.8;

        // Check admin status
        fetch('?action=status')
        .then(r => r.json())
        .then(data => {
            isAdminLoggedIn = data.isAdmin;
        });

        // Close modals on overlay click
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('active');
                }
            });
        });
    </script>
</body>
</html>
export default function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
      <div className="max-w-lg text-center">
        <div className="text-6xl mb-6">🎵</div>
        <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
          MusicHub — PHP Сайт
        </h1>
        <p className="text-gray-400 mb-6">
          PHP-файл находится в папке <code className="bg-gray-800 px-2 py-1 rounded text-purple-400">СЕРВЕР/index.php</code>
        </p>
        <div className="bg-gray-800/50 rounded-xl p-5 text-left border border-gray-700/50">
          <h3 className="text-lg font-semibold mb-3 text-white">📋 Инструкция по установке:</h3>
          <ol className="text-gray-300 space-y-2 text-sm">
            <li>1. Загрузите папку <code className="text-purple-400">СЕРВЕР</code> на PHP-сервер</li>
            <li>2. Убедитесь что PHP 7.4+ установлен</li>
            <li>3. Откройте <code className="text-purple-400">index.php</code> в браузере</li>
            <li>4. Папки <code className="text-purple-400">data/</code> и <code className="text-purple-400">data/uploads/</code> создадутся автоматически</li>
            <li>5. Войдите в админку: пароль <code className="text-purple-400">admin123</code></li>
          </ol>
        </div>
        <div className="mt-6 bg-gray-800/50 rounded-xl p-5 text-left border border-gray-700/50">
          <h3 className="text-lg font-semibold mb-3 text-white">✨ Возможности:</h3>
          <ul className="text-gray-300 space-y-1 text-sm">
            <li>• 🎧 Красивый аудиоплеер с визуализацией</li>
            <li>• 📁 Загрузка аудиофайлов и обложек</li>
            <li>• ⬇️ Скачивание треков</li>
            <li>• 🔍 Поиск и фильтрация</li>
            <li>• 🎛️ Полная админ-панель (CRUD)</li>
            <li>• 💾 Хранение в JSON (без БД)</li>
            <li>• 📱 Адаптивный дизайн</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new window.KinesioEMGApp();
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').catch(error => {
            console.error('No se pudo preparar el funcionamiento sin conexión:', error.message);
        });
    });
}

window.addEventListener('error', event => {
    console.error('Error no controlado en DEMASY:', event.error?.message || event.message);
    window.app?.showNotification('Ocurrió un error inesperado. Los datos guardados no fueron eliminados.', 'error');
});

window.addEventListener('unhandledrejection', event => {
    console.error('Promesa no controlada en DEMASY:', event.reason?.message || String(event.reason));
    window.app?.showNotification('Una operación no pudo completarse. Revisa el estado e inténtalo nuevamente.', 'error');
});


import os
import ssl
import logging
import certifi

logger = logging.getLogger(__name__)

# Путь к пользовательскому сертификату
CUSTOM_CERT_PATH = os.path.join(os.path.dirname(__file__), 'cert.pem')
COMBINED_CERT_PATH = os.path.join(os.path.dirname(__file__), 'combined_certs.pem')

# Проверяем наличие пользовательского сертификата
if not os.path.exists(CUSTOM_CERT_PATH):
    raise FileNotFoundError(f"Certificate file not found: {CUSTOM_CERT_PATH}")

# Объединяем системные сертификаты с пользовательским
def create_combined_certificate():
    """Объединяет системные сертификаты с пользовательским"""
    try:
        # Читаем системные сертификаты
        with open(certifi.where(), 'r') as f_system:
            system_certs = f_system.read()
        
        # Читаем пользовательский сертификат
        with open(CUSTOM_CERT_PATH, 'r') as f_custom:
            custom_cert = f_custom.read()
        
        # Объединяем
        combined = system_certs + '\n' + custom_cert
        
        # Сохраняем объединенный файл
        with open(COMBINED_CERT_PATH, 'w') as f_combined:
            f_combined.write(combined)
        
        logger.info(f"Combined certificates saved to: {COMBINED_CERT_PATH}")
        return COMBINED_CERT_PATH
    except Exception as e:
        logger.error(f"Failed to create combined certificates: {e}")
        raise

# Создаем объединенный файл сертификатов
combined_cert_path = create_combined_certificate()

# Устанавливаем переменные окружения для всех компонентов
os.environ['SSL_CERT_FILE'] = combined_cert_path
os.environ['REQUESTS_CA_BUNDLE'] = combined_cert_path
os.environ['CURL_CA_BUNDLE'] = combined_cert_path
os.environ['GRPC_DEFAULT_SSL_ROOTS_FILE_PATH'] = combined_cert_path

logger.info(f"SSL configured with combined certificates: {combined_cert_path}")

# Создаем контекст SSL с объединенными сертификатами
def create_ssl_context():
    """Создает SSL контекст с объединенными сертификатами"""
    context = ssl.create_default_context()
    context.load_verify_locations(combined_cert_path)
    return context

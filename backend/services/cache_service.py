import redis
import json
import hashlib
import os

class CacheService:
    def __init__(self):
        redis_host = os.getenv("REDIS_HOST", "localhost")
        redis_port = int(os.getenv("REDIS_PORT", 6379))
        
        try:
            self.redis_client = redis.Redis(host=redis_host, port=redis_port, db=0, decode_responses=True)
            self.redis_client.ping()
            self.enabled = True
        except redis.ConnectionError:
            print("WARNING: Redis is not available. Caching is disabled.")
            self.enabled = False

    def generate_hash(self, image_bytes: bytes) -> str:
        return hashlib.sha256(image_bytes).hexdigest()

    def get_cached_result(self, image_hash: str):
        if not self.enabled:
            return None
        
        cached_data = self.redis_client.get(image_hash)
        if cached_data:
            print("DEBUG: Cache hit!")
            return json.loads(cached_data)
        return None

    def set_cached_result(self, image_hash: str, data: dict, expire_secs: int = 86400):
        if self.enabled:
            self.redis_client.set(image_hash, json.dumps(data), ex=expire_secs)

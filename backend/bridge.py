import sys
import json
from multiprocessing.connection import Client

data = json.loads(sys.argv[1])
conn = Client(("localhost", 8000))
conn.send(data)
result = conn.recv()
conn.close()
print(json.dumps(result))

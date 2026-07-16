FROM python:3.13-slim

WORKDIR /app

COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -i https://pypi.org/simple -r /tmp/requirements.txt

COPY importer/ .

CMD ["python", "-u", "main.py"]

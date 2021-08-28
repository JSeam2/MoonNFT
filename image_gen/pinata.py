import requests
import secret


def pin_to_pinata(file_obj, filename):
    url = "https://api.pinata.cloud/pinning/pinFileToIPFS"

    payload = {}
    files = [
        ('file', (filename, file_obj, 'image/png'))
    ]
    headers = {
        'pinata_api_key': secret.API_KEY,
        'pinata_secret_api_key': secret.API_SECRET
    }

    response = requests.request("POST", url, headers=headers, data=payload, files=files)
    return response.json()
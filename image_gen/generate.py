from PIL import Image
import numpy as np
import os
import json
import secret
import pinata

# 24x24 -> 480x480
dimensions = 480, 480

for x in range(1, 10001):
    # bg color
    bg_r = np.random.choice(np.arange(1, 9)[::-1], p=[0.6, 0.2, 0.1, 0.05, 0.025, 0.0125, 0.00625, 0.00625])
    bg_g = np.random.choice(np.arange(1, 9)[::-1], p=[0.6, 0.2, 0.1, 0.05, 0.025, 0.0125, 0.00625, 0.00625])
    bg_b = np.random.choice(np.arange(1, 9)[::-1], p=[0.6, 0.2, 0.1, 0.05, 0.025, 0.0125, 0.00625, 0.00625])
    bg = (256 // bg_r, 256 // bg_g, 256 // bg_b)

    # star
    st_r = np.random.choice(np.arange(1, 9), p=[0.6, 0.2, 0.1, 0.05, 0.025, 0.0125, 0.00625, 0.00625])
    st_g = np.random.choice(np.arange(1, 9), p=[0.6, 0.2, 0.1, 0.05, 0.025, 0.0125, 0.00625, 0.00625])
    st_b = np.random.choice(np.arange(1, 9), p=[0.6, 0.2, 0.1, 0.05, 0.025, 0.0125, 0.00625, 0.00625])
    st = (256 // st_r, 256 // st_g, 256 // st_b)

    # moon
    mo_r = np.random.choice(np.arange(1, 9), p=[0.6, 0.2, 0.1, 0.05, 0.025, 0.0125, 0.00625, 0.00625])
    mo_g = np.random.choice(np.arange(1, 9), p=[0.6, 0.2, 0.1, 0.05, 0.025, 0.0125, 0.00625, 0.00625])
    mo_b = np.random.choice(np.arange(1, 9), p=[0.6, 0.2, 0.1, 0.05, 0.025, 0.0125, 0.00625, 0.00625])
    mo = (256 // mo_r, 256 // mo_g, 256 // mo_b)

    # outline
    ol = (0, 0, 0)

    moon = [
        [bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg],
        [bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, st, bg, bg, bg, bg, bg, bg, bg, bg, bg],
        [bg, bg, bg, st, bg, bg, bg, bg, st, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, st, bg, bg],
        [bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg],
        [bg, st, bg, bg, bg, bg, bg, bg, bg, ol, ol, ol, ol, ol, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg],
        [bg, bg, bg, bg, bg, bg, bg, bg, ol, mo, mo, mo, mo, mo, ol, bg, bg, bg, bg, bg, bg, bg, bg, bg],
        [bg, bg, bg, bg, st, bg, bg, ol, mo, mo, mo, mo, mo, mo, mo, ol, bg, bg, bg, bg, bg, st, bg, bg],
        [bg, bg, bg, bg, bg, bg, ol, mo, mo, mo, mo, mo, mo, mo, mo, mo, ol, bg, bg, bg, bg, bg, bg, bg],
        [bg, bg, bg, bg, bg, bg, ol, mo, mo, mo, mo, mo, mo, mo, mo, mo, ol, bg, bg, bg, bg, bg, bg, bg],
        [bg, bg, bg, bg, bg, bg, ol, mo, mo, mo, mo, mo, mo, mo, mo, mo, ol, bg, bg, bg, bg, bg, bg, bg],
        [bg, bg, bg, bg, bg, bg, ol, mo, mo, mo, mo, mo, mo, mo, mo, mo, ol, bg, bg, bg, st, bg, bg, bg],
        [bg, bg, bg, bg, bg, bg, ol, mo, mo, mo, mo, mo, mo, mo, mo, mo, ol, bg, bg, bg, bg, bg, bg, bg],
        [bg, bg, bg, bg, bg, bg, ol, mo, mo, mo, mo, mo, mo, mo, mo, mo, ol, bg, bg, bg, bg, bg, bg, bg],
        [bg, bg, bg, bg, bg, bg, bg, ol, mo, mo, mo, mo, mo, mo, mo, ol, bg, bg, bg, bg, bg, bg, bg, bg],
        [bg, bg, st, bg, bg, bg, bg, bg, ol, mo, mo, mo, mo, mo, ol, bg, bg, bg, bg, bg, bg, bg, bg, bg],
        [bg, bg, bg, bg, bg, bg, bg, bg, bg, ol, ol, ol, ol, ol, bg, bg, bg, bg, bg, st, bg, bg, st, bg],
        [bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg],
        [bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg],
        [bg, bg, bg, bg, bg, bg, bg, bg, st, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg],
        [bg, bg, bg, bg, bg, bg, st, bg, bg, bg, bg, bg, st, bg, bg, bg, bg, bg, bg, bg, st, bg, bg, bg],
        [bg, bg, st, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, st, bg, bg, bg, bg, bg, bg, bg, bg],
        [bg, bg, bg, bg, bg, bg, bg, bg, st, bg, bg, bg, bg, bg, bg, bg, bg, bg, st, bg, bg, bg, bg, bg],
        [bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, st, bg],
        [bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg, bg]
    ]

    array = np.array(moon, dtype=np.uint8)

    new_image = Image.fromarray(array, mode="RGB")
    new_image = new_image.resize(dimensions, resample=0)
    # imgname = os.path.join("images", 
    #     'bg(r=' + str(bg[0]) + 'g=' + str(bg[1]) + 'b=' + str(bg[2]) + ')_' 
    #     + 'mo(r=' + str(mo[0]) + 'g=' + str(mo[1]) + 'b=' + str(mo[2]) + ')_' 
    #     + 'st(r=' + str(st[0]) + 'g=' + str(st[1]) + 'b=' + str(mo[2]) + ')' 
    #     + '.png')
    imgname = os.path.join("images", str(x) + ".png")
    new_image.save(imgname)

    with open(imgname, 'rb') as f:
        res = pinata.pin_to_pinata(f, str(x) + ".png")
        hash = res['IpfsHash']

    metadata = {
        "image": 'ipfs://' + hash,
        "name": str(x),
        "description": "MoonNFTs were created to celebrate the launch of Moonriver on Kusama",
        "attributes": [
            { "trait_type": "Background Red", "value": int(bg_r) },
            { "trait_type": "Background Green", "value": int(bg_g) },
            { "trait_type": "Background Blue", "value": int(bg_b) },
            { "trait_type": "Moon Red", "value": int(mo_r) },
            { "trait_type": "Moon Green", "value": int(mo_g) },
            { "trait_type": "Moon Blue", "value": int(mo_b) },
            { "trait_type": "Star Red", "value": int(st_r) },
            { "trait_type": "Star Green", "value": int(st_g) },
            { "trait_type": "Star Blue", "value": int(st_b) },
        ]
    }

    with open(os.path.join("metadata", str(x)) , "w") as f:
        json.dump(metadata, f, indent=2)

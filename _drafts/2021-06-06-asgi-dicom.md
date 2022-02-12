cd ~/projects
conda create -n asgi_dicom python=3.9
conda activate asgi_dicom


```python
# requirements.txt
pynetdicom>=1.5
django>=3.2
```

pip install -r requirements.txt

django-admin startproject asgi_dicom
cd asgi_dicom && django-admin startapp storescp

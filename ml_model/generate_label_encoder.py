import pickle
from sklearn.preprocessing import LabelEncoder

# List of gesture classes (same as frontend)
gesture_classes = [
    'اسکول', 'انتہائی', 'انگریزی', 'آؤ', 'آپ', 'اچھا', 'اہم', 'بند کرو', 'بولنا', 'بھاری',
    'بھوکے ہو', 'تم', 'تیار', 'جاتا ہو', 'جلدی', 'خبردار', 'خطرناک', 'خوفناک', 'دروازہ', 'دلچسپ',
    'دور', 'دکھنا', 'دیر سے', 'ذہین', 'سستا', 'سمجھ گیا', 'شور', 'صحت مند', 'عُلیٰ سَمَت استعمال',
    'غیر ملکی', 'لاجواب', 'لیا ہے', 'مجھ سے', 'محتاط', 'محفوظ', 'مضحکہ خیز', 'ملنا', 'مہذب',
    'میں', 'نہیں', 'نیا', 'ٹی وی', 'پانی پینا', 'پاگل', 'پرامن', 'پرجوش', 'چاہتاہو', 'کم',
    'کھنا کھاؤ', 'کیا', 'گونگا', 'ہاں', 'ہو', 'ہوشیار'
]

# Create and fit label encoder
label_encoder = LabelEncoder()
label_encoder.fit(gesture_classes)

# Save to pickle file in the current folder
with open("label_encoder.pkl", "wb") as f:
    pickle.dump(label_encoder, f)

print("✅ label_encoder.pkl has been generated successfully.")

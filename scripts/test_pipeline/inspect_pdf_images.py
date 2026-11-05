import os
import pymupdf

pdf_path = r"f:\neira\Dataset\NTA offical\JEE_Main_2024_27-01-2024_Shift1_B_Tech_27th_Jan_2024_Shift_1_English_Hindi.pdf"
doc = pymupdf.open(pdf_path)

out_dir = r"f:\neira\reports\internal_backend_test\assets\extracted_page2_images"
os.makedirs(out_dir, exist_ok=True)

page = doc[1] # Page 2
print("Page 2 rect:", page.rect)
image_list = page.get_images(full=True)
print(f"Page 2 has {len(image_list)} images:")

for idx, img_info in enumerate(image_list):
    xref = img_info[0]
    rects = page.get_image_rects(xref)
    base_image = doc.extract_image(xref)
    ext = base_image["ext"]
    w = base_image["width"]
    h = base_image["height"]
    img_bytes = base_image["image"]
    save_path = os.path.join(out_dir, f"img_{idx}_{xref}.{ext}")
    with open(save_path, "wb") as f:
        f.write(img_bytes)
    print(f"  Img {idx}: xref={xref}, format={ext}, dims={w}x{h}, rects={rects}, saved={save_path}")

print("\nText blocks on Page 2:")
for b in page.get_text("blocks"):
    bbox = b[:4]
    txt = b[4].strip().replace("\n", " ")
    print(f"  bbox={bbox}: {txt[:80]}")

doc.close()

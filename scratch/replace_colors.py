import os
import re

replacements = [
    (r'bg-\[\#00C800\]', 'bg-brand-main'),
    (r'text-\[\#00C800\]', 'text-brand-main'),
    (r'border-\[\#00C800\]', 'border-brand-main'),
    (r'bg-green-500', 'bg-brand-main'),
    (r'text-green-500', 'text-brand-main'),
    (r'border-green-500', 'border-brand-main'),
    (r'bg-green-600', 'bg-brand-hover'),
    (r'text-green-600', 'text-brand-hover'),
    (r'border-green-600', 'border-brand-hover'),
    (r'bg-green-400', 'bg-brand-hover'),
    (r'text-green-400', 'text-brand-hover'),
    (r'border-green-400', 'border-brand-hover'),
    (r'bg-green-900', 'bg-brand-border'),
    (r'border-green-900', 'border-brand-border'),
    (r'bg-green-50', 'bg-brand-light'),
    (r'text-green-950', 'text-brand-dark'),
    (r'hover:text-green-700', 'hover:text-brand-border')
]

for root, _, files in os.walk('apps/b2b-storefront/src'):
    for file in files:
        if file.endswith(('.tsx', '.ts')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = content
            for old, new in replacements:
                new_content = re.sub(old, new, new_content)
                
            if new_content != content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {path}")

import os
import shutil

project_root = 'D:/PASTA_PROJETOS_ANDAMENTO/MANUS'
packed_dir = os.path.join(project_root, 'manus_packed')
zip_file_name = os.path.join(project_root, 'manus_project') # Name without .zip extension

# Create the zip archive
shutil.make_archive(zip_file_name, 'zip', packed_dir)

# Clean up the packed directory
shutil.rmtree(packed_dir)

# Clean up the packing script itself
os.remove(os.path.join(project_root, 'pack_project.py'))

print(f"Project successfully zipped to {zip_file_name}.zip and temporary files cleaned up.")

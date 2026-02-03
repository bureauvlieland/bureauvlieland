import { AdminLayout } from "@/components/admin/AdminLayout";
import { MediaLibrary } from "@/components/admin/MediaLibrary";

const AdminMedia = () => {
  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mediabibliotheek</h1>
          <p className="text-slate-500">
            Beheer alle afbeeldingen voor bouwstenen. Upload nieuwe afbeeldingen of kopieer URLs om te gebruiken.
          </p>
        </div>

        <MediaLibrary />
      </div>
    </AdminLayout>
  );
};

export default AdminMedia;

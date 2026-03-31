import "./folder.css";

export type FolderProps = {
  label: string;
};

export default function Folder({ label }: FolderProps) {
  return (
    <figure className="profile-folder-slot">
      <div className="profile-folder" role="img" aria-label={`${label} folder`}>
        <div className="profile-folder__pocket">
          <div className="profile-folder__back" aria-hidden />
          <div className="profile-folder__papers" aria-hidden>
            <span className="profile-folder__paper profile-folder__paper--1" />
            <span className="profile-folder__paper profile-folder__paper--2" />
            <span className="profile-folder__paper profile-folder__paper--3" />
          </div>
        </div>
        <div className="profile-folder__cover" aria-hidden>
          <div className="profile-folder__tab" />
          <div className="profile-folder__lid" />
        </div>
      </div>
      <figcaption className="profile-folder-label">{label}</figcaption>
    </figure>
  );
}

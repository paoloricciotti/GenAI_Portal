export default function ProjectTile({ project, onClick }) {
  return (
    <div className="project-tile" onClick={() => onClick(project)}>
      <h3>{project.nome}</h3>
      <p>{project.descrizione}</p>
      {/* Aggiungi qui badge o stati del progetto */}
    </div>
  );
}
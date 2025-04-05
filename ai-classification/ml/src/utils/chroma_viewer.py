import chromadb
from rich.console import Console
from rich.table import Table
from rich import print as rprint
from rich.panel import Panel
import json
from datetime import datetime
from pathlib import Path
from typing import Optional, List

class ChromaViewer:
    def __init__(self, db_path: Optional[str] = None):
        self.console = Console()
        try:
            if db_path is None:
                # Look for database in common locations
                possible_paths = [
                    "../chroma_db",
                ]
                
                for path in possible_paths:
                    if Path(path).exists():
                        db_path = path
                        break
                        
            if not db_path or not Path(db_path).exists():
                raise FileNotFoundError("ChromaDB database not found. Please specify the correct path.")
                
            self.client = chromadb.PersistentClient(path=db_path)
            rprint(f"[green]Successfully connected to database at: {db_path}[/green]")
            
        except Exception as e:
            rprint(f"[red]Error connecting to database: {str(e)}[/red]")
            raise

    def list_collections(self):
        """List all collections in the database"""
        try:
            # Get collection names
            collection_names = self.client.list_collections()
            
            table = Table(title="ChromaDB Collections")
            table.add_column("Name", style="cyan")
            table.add_column("Count", style="green")
            table.add_column("Metadata", style="yellow")
            
            for name in collection_names:
                try:
                    # Get collection by name
                    collection = self.client.get_collection(name=name)
                    # Get count and metadata
                    count = collection.count()
                    metadata = collection.metadata if collection.metadata else {}
                    
                    table.add_row(
                        name,
                        str(count),
                        str(metadata)
                    )
                except Exception as e:
                    table.add_row(
                        name,
                        "Error",
                        f"Error getting collection info: {str(e)}"
                    )
            
            self.console.print(table)
            return collection_names

        except Exception as e:
            rprint(f"[red]Error listing collections: {str(e)}[/red]")
            return []

    def view_collection(self, collection_name: str, limit: int = 10, sort_by: str = "timestamp"):
        """View contents of a specific collection with sorting and limiting"""
        try:
            collection = self.client.get_collection(collection_name)
            if collection.count() == 0:
                rprint(f"[yellow]Collection '{collection_name}' is empty[/yellow]")
                return

            results = collection.get()
            
            # Sort results by timestamp if available
            sorted_indices = list(range(len(results['ids'])))
            if sort_by in results['metadatas'][0]:
                sorted_indices.sort(
                    key=lambda i: results['metadatas'][i][sort_by],
                    reverse=True
                )

            # Create table for collection contents
            table = Table(
                title=f"Collection: {collection_name} (Showing {min(limit, len(results['ids']))} of {len(results['ids'])} entries)"
            )
            table.add_column("ID", style="cyan", no_wrap=True)
            table.add_column("Document", style="green", no_wrap=False)
            table.add_column("Metadata", style="yellow", no_wrap=False)

            # Add rows with sorted and limited data
            for idx in sorted_indices[:limit]:
                # Format document content
                try:
                    doc = json.loads(results['documents'][idx])
                    doc_str = json.dumps(doc, indent=2)
                except:
                    doc_str = results['documents'][idx]

                # Format metadata
                metadata_str = json.dumps(results['metadatas'][idx], indent=2)

                table.add_row(
                    results['ids'][idx],
                    doc_str,
                    metadata_str
                )

            self.console.print(table)

        except Exception as e:
            rprint(f"[red]Error viewing collection {collection_name}: {str(e)}[/red]")

    def search_collection(self, collection_name: str, query: str, n_results: int = 5):
        """Search within a collection using the query"""
        try:
            collection = self.client.get_collection(collection_name)
            results = collection.query(
                query_texts=[query],
                n_results=n_results
            )

            table = Table(title=f"Search Results for '{query}' in {collection_name}")
            table.add_column("Score", style="cyan")
            table.add_column("Document", style="green")
            table.add_column("Metadata", style="yellow")

            for i, (doc, metadata) in enumerate(zip(results['documents'][0], results['metadatas'][0])):
                table.add_row(
                    f"{results['distances'][0][i]:.4f}",
                    str(doc),
                    json.dumps(metadata, indent=2)
                )

            self.console.print(table)

        except Exception as e:
            rprint(f"[red]Error searching collection {collection_name}: {str(e)}[/red]")

def main():
    viewer = ChromaViewer()
    
    while True:
        rprint("\n[bold cyan]ChromaDB Viewer[/bold cyan]")
        rprint("1. List all collections")
        rprint("2. View collection contents")
        rprint("3. Search in collection")
        rprint("4. Exit")
        
        choice = input("\nEnter choice (1-4): ")
        
        if choice == "1":
            viewer.list_collections()
            
        elif choice == "2":
            collections = viewer.client.list_collections()
            if not collections:
                rprint("[yellow]No collections found[/yellow]")
                continue
                
            rprint("\nAvailable collections:")
            # Changed: collections now contains names directly
            for i, coll_name in enumerate(collections, 1):
                rprint(f"{i}. {coll_name}")
            
            coll_idx = int(input("\nEnter collection number: ")) - 1
            if coll_idx < 0 or coll_idx >= len(collections):
                rprint("[red]Invalid collection number[/red]")
                continue
                
            limit = int(input("Enter number of entries to show (default 10): ") or "10")
            
            # Changed: use collection name directly
            viewer.view_collection(collections[coll_idx], limit=limit)
            
        elif choice == "3":
            collections = viewer.client.list_collections()
            if not collections:
                rprint("[yellow]No collections found[/yellow]")
                continue
                
            rprint("\nAvailable collections:")
            for i, coll_name in enumerate(collections, 1):
                rprint(f"{i}. {coll_name}")
                
            coll_idx = int(input("\nEnter collection number: ")) - 1
            if coll_idx < 0 or coll_idx >= len(collections):
                rprint("[red]Invalid collection number[/red]")
                continue
                
            query = input("Enter search query: ")
            n_results = int(input("Enter number of results (default 5): ") or "5")
            
            # Changed: use collection name directly
            viewer.search_collection(collections[coll_idx], query, n_results)
            
        elif choice == "4":
            break
            
        else:
            rprint("[red]Invalid choice[/red]")

if __name__ == "__main__":
    main()

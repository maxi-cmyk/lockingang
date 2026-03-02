# -*- coding: utf-8 -*-
"""
RAG CHATBOT STARTER KIT
======================
Learn how to build a Retrieval-Augmented Generation (RAG) chatbot!

This starter kit is organized into clear sections:
1. Configuration & Setup
2. Pinecone Database Operations
3. Web Scraping
4. Text Processing (Chunking)
5. RAG System (Retrieval + Generation)
6. Chatbot Interface

Follow along and uncomment sections as you learn!
"""

# ============================================================================
# SECTION 1: IMPORTS & DEPENDENCIES
# ============================================================================
# Run: pip install pinecone openai requests pypdf python-dotenv

import os
import requests
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec
from openai import OpenAI
from pypdf import PdfReader
import time

print("[SUCCESS] All libraries imported successfully!\n")


# ============================================================================
# SECTION 2: CONFIGURATION & SETUP
# ============================================================================

# Load environment variables from .env file
load_dotenv()

# Read API keys and configuration from environment variables
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
INDEX_NAME = os.getenv("PINECONE_INDEX", "my-first-rag")  # Default: my-first-rag
EMBED_MODEL = os.getenv("EMBED_MODEL", "text-embedding-3-small")  # Default OpenAI embedding model
EMBED_DIMENSIONS = int(os.getenv("EMBED_DIMENSIONS", "1024"))  # Default: 1024

# Validate required API keys
if not PINECONE_API_KEY:
    raise ValueError("PINECONE_API_KEY not found in .env file")
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY not found in .env file")

print("[SUCCESS] Environment variables loaded!")
print(f"[CONFIG] Using index: {INDEX_NAME}")
print(f"[CONFIG] Using embedding model: {EMBED_MODEL}")
print(f"[CONFIG] Using embedding dimensions: {EMBED_DIMENSIONS}\n")

# Initialize OpenAI client (used for both embeddings and chat)
print("[SETUP] Initializing OpenAI client...")
openai_client = OpenAI(api_key=OPENAI_API_KEY)
print("[SUCCESS] OpenAI client initialized!")

# Initialize Pinecone (vector database)
print("[SETUP] Connecting to Pinecone...")
pc = Pinecone(api_key=PINECONE_API_KEY)

# Create or connect to index
if INDEX_NAME not in pc.list_indexes().names():
    print(f"[SETUP] Creating new index: {INDEX_NAME}")
    pc.create_index(
        name=INDEX_NAME,
        dimension=EMBED_DIMENSIONS,  # Must match embedding model dimension
        metric='cosine',
        spec=ServerlessSpec(cloud='aws', region='us-east-1')
    )
    time.sleep(10)  # Wait for index to initialize

pinecone_index = pc.Index(INDEX_NAME)
print(f"[SUCCESS] Connected to Pinecone index: {INDEX_NAME}")

print("\n" + "="*70)
print("[COMPLETE] SETUP COMPLETE! Ready to build your RAG chatbot!")
print("="*70 + "\n")


# ============================================================================
# SECTION 3: PINECONE DATABASE OPERATIONS
# ============================================================================
# This section handles storing and retrieving information from Pinecone

def create_embedding(text):
    """
    Convert text to embedding vector using OpenAI's API
    
    Args:
        text (str): The text to convert to embedding
    
    Returns:
        list: Embedding vector (list of floats)
    
    Example:
        embedding = create_embedding("Hello world")
    """
    response = openai_client.embeddings.create(
        model=EMBED_MODEL,
        input=text,
        dimensions=EMBED_DIMENSIONS
    )
    return response.data[0].embedding


def store_in_pinecone(text, source_name, chunk_id):
    """
    Store text in Pinecone vector database
    
    Args:
        text (str): The text content to store
        source_name (str): Name/category of the source (e.g., "wikipedia", "docs")
        chunk_id (int): Unique identifier for this chunk
    
    Example:
        store_in_pinecone("AI is awesome", "facts", 1)
    """
    # Convert text to embedding (vector) using OpenAI
    embedding = create_embedding(text)
    
    # Create unique ID and store in Pinecone
    vector_id = f"{source_name}_{chunk_id}"
    pinecone_index.upsert([
        (vector_id, embedding, {"text": text, "source": source_name})
    ])
    
    print(f"[STORED] '{text[:50]}...' (ID: {vector_id})")


def read_file(file_path):
    """
    Read content from different file types (PDF, txt, md)
    
    Args:
        file_path (str): Path to the file to read
    
    Returns:
        str: Extracted text content from the file
    
    Supported formats:
        - .pdf: PDF documents
        - .txt: Plain text files
        - .md: Markdown files
    
    Example:
        content = read_file("document.pdf")
    """
    if not os.path.exists(file_path):
        print(f"[ERROR] File not found: {file_path}")
        return ""
    
    file_extension = os.path.splitext(file_path)[1].lower()
    
    # Handle PDF files
    if file_extension == '.pdf':
        print(f"[READING] Reading PDF file: {file_path}")
        try:
            reader = PdfReader(file_path)
            text = ""
            for page_num, page in enumerate(reader.pages):
                text += page.extract_text() + "\n"
            print(f"[SUCCESS] Extracted {len(text)} characters from {len(reader.pages)} pages")
            return text
        except Exception as e:
            print(f"[ERROR] Failed to read PDF: {str(e)}")
            return ""
    
    # Handle text files (.txt, .md, or any other text format)
    else:
        print(f"[READING] Reading text file: {file_path}")
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read()
            print(f"[SUCCESS] Read {len(text)} characters")
            return text
        except Exception as e:
            print(f"[ERROR] Failed to read file: {str(e)}")
            return ""


def store_file_in_pinecone(file_path, chunk_size=800, overlap=100):
    """
    Read a file and store its content in Pinecone with automatic chunking
    
    This function:
    1. Reads the file (supports PDF, txt, md)
    2. Chunks the content automatically
    3. Stores each chunk in Pinecone
    
    Args:
        file_path (str): Path to the file to process
        chunk_size (int): Size of each chunk in characters (default: 800)
        overlap (int): Number of overlapping characters between chunks (default: 100)
    
    Returns:
        int: Number of chunks stored in Pinecone
    
    Example:
        # Store a PDF document
        num_chunks = store_file_in_pinecone("research_paper.pdf")
        
        # Store a markdown file
        num_chunks = store_file_in_pinecone("documentation.md")
    """
    # Read the file content
    content = read_file(file_path)
    
    if not content:
        print(f"[WARNING] No content extracted from {file_path}")
        return 0
    
    # Get filename without extension for source name
    filename = os.path.basename(file_path)
    source_name = os.path.splitext(filename)[0]
    
    # Chunk the content
    chunks = chunk_text(content, chunk_size=chunk_size, overlap=overlap)
    
    # Store each chunk in Pinecone
    print(f"[STORING] Storing {len(chunks)} chunks from {filename}...")
    for i, chunk in enumerate(chunks):
        store_in_pinecone(chunk, source_name, i)
    
    print(f"[SUCCESS] Stored {len(chunks)} chunks from {filename}")
    return len(chunks)


def retrieve_from_pinecone(query, top_k=3):
    """
    Search Pinecone for relevant information
    
    Args:
        query (str): The search question/query
        top_k (int): Number of results to return
    
    Returns:
        list: List of matching text chunks with metadata
    
    Example:
        results = retrieve_from_pinecone("What is AI?", top_k=3)
    """
    # Convert query to embedding using OpenAI
    query_embedding = create_embedding(query)
    
    # Search Pinecone
    results = pinecone_index.query(
        vector=query_embedding,
        top_k=top_k,
        include_metadata=True
    )
    
    # Extract and return relevant text
    relevant_texts = [match['metadata']['text'] for match in results['matches']]
    return relevant_texts


def clear_database():
    """
    Clear all vectors from the Pinecone database
    
    This function deletes all stored documents from the current index.
    Use with caution as this action cannot be undone!
    
    Returns:
        bool: True if successful, False otherwise
    
    Example:
        clear_database()
    """
    try:
        print("\n[WARNING] Clearing all data from Pinecone database...")
        
        # Delete all vectors from the index
        pinecone_index.delete(delete_all=True)
        
        print("[SUCCESS] Database cleared successfully!\n")
        return True
    except Exception as e:
        print(f"[ERROR] Failed to clear database: {str(e)}\n")
        return False


def ingest_files_from_folder(folder_path="Files to insert (PDF or TXT)"):
    """
    Automatically ingest all PDF and TXT files from a specified folder
    
    This function:
    1. Scans the folder for PDF and TXT files
    2. Reads and chunks each file
    3. Stores all chunks in Pinecone
    4. Reports results and reminds user to remove files
    
    Args:
        folder_path (str): Path to folder containing files (default: "Files to insert (PDF or TXT)")
    
    Returns:
        int: Total number of files processed
    
    Example:
        ingest_files_from_folder("Files to insert (PDF or TXT)")
    """
    print(f"\n[SCANNING] Looking for files in '{folder_path}' folder...\n")
    
    # Check if folder exists
    if not os.path.exists(folder_path):
        print(f"[ERROR] Folder '{folder_path}' not found!")
        print(f"[INFO] Please create a '{folder_path}' folder and place your PDF/TXT files inside.\n")
        return 0
    
    # Get all PDF and TXT files
    files = []
    for filename in os.listdir(folder_path):
        if filename.lower().endswith(('.pdf', '.txt', '.md')):
            files.append(os.path.join(folder_path, filename))
    
    if not files:
        print(f"[WARNING] No PDF, TXT, or MD files found in '{folder_path}' folder.\n")
        return 0
    
    print(f"[FOUND] {len(files)} file(s) to process:\n")
    for file in files:
        print(f"  - {os.path.basename(file)}")
    
    print(f"\n[PROCESSING] Starting ingestion...\n")
    
    # Process each file
    total_chunks = 0
    processed_files = []
    
    for file_path in files:
        try:
            num_chunks = store_file_in_pinecone(file_path, chunk_size=800, overlap=100)
            total_chunks += num_chunks
            processed_files.append(os.path.basename(file_path))
            print()
        except Exception as e:
            print(f"[ERROR] Failed to process {os.path.basename(file_path)}: {str(e)}\n")
    
    # Summary
    print("=" * 70)
    print(f"[COMPLETE] Ingestion complete!")
    print(f"  - Files processed: {len(processed_files)}")
    print(f"  - Total chunks stored: {total_chunks}")
    print("=" * 70)
    
    # Reminder to remove files
    print("\n[IMPORTANT] To prevent duplicate insertions:")
    print(f"  Please remove or move the processed files from the '{folder_path}' folder.\n")
    print("Processed files:")
    for filename in processed_files:
        print(f"  - {filename}")
    print()
    
    return len(processed_files)


# ============================================================================
# SECTION 4: WEB SCRAPING
# ============================================================================
# This section handles fetching content from websites

def scrape_website(url):
    """
    Scrape text content from any website using Jina AI
    
    Args:
        url (str): The website URL to scrape
    
    Returns:
        str: The extracted text content in markdown format
    
    Example:
        content = scrape_website("https://en.wikipedia.org/wiki/Scuderia_AlphaTauri")
    """
    print(f"[SCRAPING] Scraping website: {url}")
    
    # Jina AI provides a simple API to extract clean text from websites
    jina_url = f"https://r.jina.ai/{url}"
    response = requests.get(jina_url)
    
    if response.status_code == 200:
        print("[SUCCESS] Website scraped successfully!")
        return response.text
    else:
        print(f"[ERROR] Failed to scrape website. Status code: {response.status_code}")
        return ""


# ============================================================================
# SECTION 5: TEXT PROCESSING (CHUNKING)
# ============================================================================
# This section handles breaking large text into smaller, manageable chunks

def chunk_text(text, chunk_size=800, overlap=100):
    """
    Split large text into smaller overlapping chunks
    
    Why chunking?
    - Better retrieval accuracy (focused, relevant chunks)
    - Avoid context overflow in embeddings
    - Improved search performance
    
    Args:
        text (str): The text to split
        chunk_size (int): Size of each chunk in characters (default: 800)
        overlap (int): Number of overlapping characters between chunks (default: 100)
    
    Returns:
        list: List of text chunks
    
    Example:
        chunks = chunk_text(long_text, chunk_size=800, overlap=100)
    """
    chunks = []
    start = 0
    
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        
        # Only add non-empty chunks
        if chunk.strip():
            chunks.append(chunk)
        
        # Move to next chunk with overlap
        start = end - overlap
    
    print(f"[CHUNKING] Split text into {len(chunks)} chunks")
    return chunks


# ============================================================================
# SECTION 6: RAG SYSTEM (RETRIEVAL + GENERATION)
# ============================================================================
# This section combines retrieval (Pinecone) with generation (GPT-4o-mini)

def get_relevant_context(question, top_k=3):
    """
    Retrieve relevant context for a question (Internal helper function)
    
    Args:
        question (str): User's question
        top_k (int): Number of relevant chunks to retrieve
    
    Returns:
        str: Combined relevant context
    """
    relevant_chunks = retrieve_from_pinecone(question, top_k=top_k)
    return "\n\n".join(relevant_chunks)


def chat_with_rag(user_question):
    """
    Answer questions using RAG (Retrieval-Augmented Generation)
    
    Process:
    1. Retrieve relevant context from Pinecone
    2. Combine context with user question
    3. Generate answer using GPT-4o-mini`
    
    Args:
        user_question (str): The user's question
    
    Returns:
        str: AI-generated answer based on retrieved context
    
    Example:
        answer = chat_with_rag("What is artificial intelligence?")
    """
    # Step 1: Retrieve relevant information from Pinecone
    context = get_relevant_context(user_question, top_k=3)
    
    # Step 2: Create prompt with context
    system_prompt = "You are a helpful assistant that answers questions based on the provided context."
    
    user_prompt = f"""Use the following context to answer the question. 
If the answer is not in the context, say "I don't have information about that in my knowledge base."

Context:
{context}

Question: {user_question}

Answer:"""
    
    # Step 3: Generate response using GPT-4o-mini
    response = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.7,
        max_tokens=500
    )
    
    return response.choices[0].message.content


# ============================================================================
# SECTION 7: CHATBOT INTERFACE (CLI)
# ============================================================================
# This section provides an interactive command-line interface for the chatbot

def run_chatbot():
    """
    Start an interactive CLI chatbot session
    
    Commands:
        - Type your question to get an answer
        - Type 'ingest_files()' to load documents from 'Files to insert (PDF or TXT)' folder
        - Type 'scrape_website()' to scrape and store a website
        - Type 'clearDB()' to clear the database
        - Type 'quit', 'exit', or 'bye' to stop
    
    Example:
        run_chatbot()
    """
    print("\n" + "="*70)
    print("RAG CHATBOT - Powered by GPT-4o-mini")
    print("="*70)
    print("Ask me anything about the information in the knowledge base!")
    print("\nCommands:")
    print("  - Type your question to chat")
    print("  - Type 'ingest_files()' to load documents from 'Files to insert (PDF or TXT)' folder")
    print("  - Type 'scrape_website()' to scrape and store a website")
    print("  - Type 'clearDB()' to clear the database")
    print("  - Type 'quit' or 'exit' to stop")
    print("="*70 + "\n")
    
    while True:
        # Get user input
        user_input = input("You: ").strip()
        
        # Check for exit commands
        if user_input.lower() in ['quit', 'exit', 'bye']:
            print("\nThanks for chatting! Goodbye!\n")
            break
        
        # Check for ingest_files command
        if user_input == 'ingest_files()':
            ingest_files_from_folder("Files to insert (PDF or TXT)")
            continue
        
        # Check for clearDB command
        if user_input == 'clearDB()':
            confirm = input("\n[WARNING] Are you sure you want to clear all data? Type 'yes' to confirm: ").strip().lower()
            if confirm == 'yes':
                clear_database()
            else:
                print("[CANCELLED] Database clear operation cancelled.\n")
            continue
        
        # Check for scrape_website command
        if user_input == 'scrape_website()':
            url = input("\nEnter the website URL to scrape (e.g., https://example.com): ").strip()
            if url:
                if not url.startswith('http://') and not url.startswith('https://'):
                    print("[ERROR] URL must start with http:// or https://\n")
                    continue
                
                print(f"\n[PROCESSING] Scraping and storing content from {url}...\n")
                website_content = scrape_website(url)
                
                if website_content:
                    # Split into chunks
                    chunks = chunk_text(website_content, chunk_size=800, overlap=100)
                    
                    # Extract domain name for source naming
                    from urllib.parse import urlparse
                    domain = urlparse(url).netloc.replace('www.', '').replace('.', '-')
                    
                    # Store each chunk in Pinecone
                    for i, chunk in enumerate(chunks):
                        store_in_pinecone(chunk, domain, i)
                    
                    print(f"\n[SUCCESS] Successfully loaded {len(chunks)} chunks into knowledge base!\n")
                else:
                    print("[ERROR] Failed to scrape website. Please try again.\n")
            else:
                print("[CANCELLED] Scraping cancelled - no URL provided.\n")
            continue
        
        # Skip empty inputs
        if not user_input:
            continue
        
        try:
            # Get AI response
            print("\n[THINKING] Processing your question...\n")
            response = chat_with_rag(user_input)
            print(f"Bot: {response}\n")
            print("-" * 70 + "\n")
            
        except Exception as e:
            print(f"\n[ERROR] {str(e)}\n")
            print("Make sure your API keys are set correctly!\n")


# ============================================================================
# SECTION 8: EXAMPLE WORKFLOW
# ============================================================================
# Uncomment the sections below to try out the chatbot!

if __name__ == "__main__":
    print("\n" + "="*70)
    print("\n--- Starting chatbot ---\n")
    
    run_chatbot()
    

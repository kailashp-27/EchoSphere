# Use Node.js image for building the frontend
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application files
COPY . .

# Expose the port Vite uses (usually 5173 or 3000)
EXPOSE 5173

# Start the Vite development server
CMD ["npm", "run", "dev", "--", "--host"]

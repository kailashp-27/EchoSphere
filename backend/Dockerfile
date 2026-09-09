# Use Node.js image for the backend
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the backend files
COPY . .

# Expose the backend port
EXPOSE 5000

# Start the Express server
CMD ["node", "index.js"]

# Use an official Node.js runtime as a parent image
FROM node:20-slim

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Copy the prisma schema BEFORE installing dependencies
# This ensures 'prisma generate' will work
COPY prisma ./prisma/

# Install app dependencies
RUN npm install

# Run 'prisma generate' to create the client
RUN npx prisma generate

# Bundle app source
COPY . .

# Your app listens on process.env.PORT, which Cloud Run provides
# No EXPOSE needed

# Define the command to run your app
CMD [ "npm", "start" ]
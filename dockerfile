FROM node:18-alpine

ENV SERVER_PORT=5000 
# ENV # MONGODB_URI = mongodb+srv://test:test@cluster0.559py.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
ENV MONGODB_URI=mongodb+srv://ajayasrdeveloper1:testTEST123@marwarpay.vavto.mongodb.net/?appName=Marwarpay
ENV SALTROUND_BCRYPT=EnterValue 
ENV ACCESS_TOKEN_SECRET=tokenenter 
ENV ACCESS_TOKEN_EXPIRY=1d 
ENV REFRESH_TOKEN_SECRET=refreshtoken 
ENV REFRESH_TOKEN_EXPIRY=10d
ENV RAZORPAY_KEY_ID=rzp_live_1B0WBgPz0sHh45
ENV RAZORPAY_KEY_SECRET=h1e7NsUNwqfb8om7GL3XJsn6
# ENV # RAZORPAY_KEY_ID = rzp_test_JiHkK6X9XBuqWN
# ENV # RAZORPAY_KEY_SECRET= WXETHEZHkO7KWAbr0Kpw2CbK
# ENV # BASE_URL=http://localhost:5000/
ENV BASE_URL=https://api.zanithpay.com/
ENV CLIENT_SECRET=r5kOP0Rdxj4qYjbRFHyUKHetEGTOH1ZaHUgz4p5xqFw3aYxVvGDuFrGcHDKKudFa
ENV CLIENT_ID=ZYSEZxHszNlEzMuihWIltIqClSVFqqQeUbPYTfpjKMQiDXKJ
ENV ENC_KEY=8LWVEmyHYcJZjjB0WW2VQ+YDttzua5BGMnOX66Vi5KE=
ENV PASS_KEY=Fv5S9m79z7rUq0LG7NE4VW4GIICNPaZYPnngonlvdkxNU902
ENV WAAYU_SECRET_KEY="6af59e5a-7f28-4670-99ae-826232b467be"
ENV WAAYU_CLIENT_ID="adb25735-69c7-4411-a120-5f2e818bdae5"
ENV ISMART_PAY_PAYIN_URL=https://pay.ismartpay.co.in/api/create/order
ENV ISMART_PAY_ID=6766c78e055897060a62d5d8
ENV ISMART_PAY_MID=6766c78e055897060a62d5d5

#create an app directory
WORKDIR /app

#install all app dependencies
COPY package*.json ./

#run npm install
RUN npm install

#Bundle app source
COPY . .

EXPOSE 5000

CMD ["npm","run","prod"]
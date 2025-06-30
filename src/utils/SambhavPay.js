import CryptoJS from "crypto-js";

class SambhavPay {
  constructor() {
    this._openssl_cipher_name = "aes-256-cbc";
    this._key_len = 35;
    this._sp_salt_key = "Asdf@1234";
    this._PG_URL = "https://pg.sambhavpay.com/api/seamless/txnReq";
    this._PGStatusCheck_URL = "https://pg.sambhavpay.com/apis/seamless/txnStatus";
    // this._PGCancel_URL = "";
    // this._PGRefund_URL = "";
    this._mid; //Provided by SambhavPay (ex: 900000000000007)
    this._secretKey;
    this._saltKey;
    this._orderNo; //start with "ORD" (Alphanumeric) example"ORD1245789631542" (Always should be unique for every transaction)
    this._amount; // "Amount will be in paisa format.Rs. 10/-(10*100=1000)"
    this._currency; // INR (3 digits)
    this._txnReqType; // S/P
    this._undefinedField1;
    this._undefinedField2;
    this._undefinedField3;
    this._undefinedField4;
    this._undefinedField5;
    this._undefinedField6;
    this._undefinedField7;
    this._undefinedField8;
    this._undefinedField9;
    this._undefinedField10;
    this._emailId;
    this._mobileNo;
    this._address;
    this._city;
    this._state;
    this._pincode;
    this._customerName;
    this._respUrl;
    this._Optional1;

    // For Seamless Transaction
    this._transactionMethod;
    this._bankCode;
    this._vpa;
    this._cardNumber;
    this._expiryDate;
    this._cvv;

    // End//

    // For PayIn API
    this._RequestSequence = "mid|orderNo|amount|currency|txnReqType|undefinedField1|undefinedField2|undefinedField3|undefinedField4|undefinedField5|undefinedField6|undefinedField7|undefinedField8|undefinedField9|undefinedField10|emailId|mobileNo|address|city|state|pincode|transactionMethod|bankCode|vpa|cardNumber|expiryDate|cvv|customerName|respUrl|optional1";
    this._ResponseSequence = "mid|orderNo|txnRefNo|amount|currency|txnReqType|undefinedField1|undefinedField2|undefinedField3|undefinedField4|undefinedField5|undefinedField6|undefinedField7|undefinedField8|undefinedField9|undefinedField10|emailId|mobileNo|address|city|state|pincode|respCode|respMessage|payAmount|txnRespDate|upiString";

    // For Status Check API
    // this._TxnRefNo;
    // this._TxnAmount;
    // this._RequestSequenceStatus = "Mid|TotalAmount|TxnRefNo|OrderNo";
    // this._ResponseSequenceStatus =
    //   "Mid|OrderNo|TxnRefNo|TotalAmount|CurrencyName|MeTransReqType|AddField1|AddField2|AddField3|AddField4|AddField5|AddField6|AddField7|AddField8|AddField9|AddField10|EmailId|MobileNo|Address|City|State|Pincode|RespCode|RespMessage|PayAmount|TxnRespDate|UPIString";
    // For Cancel TRN
    // this._CancelAmount;
    // this._CancelOrderNo;
    // this._RequestSequenceCancel =
    //   "Mid|TotalAmount|TxnRefNo|OrderNo|MeTransReqType|CancelAmount|CancelOrderNo";
    // this._ResponseSequenceCancel =
    //   "Mid|OrderNo|TxnRefNo|CancelAmount|CurrencyName|MeTransReqType|RespCode|RespMessage|TxnRespDate|CancelOrderNo|CancelTxnRefNo";
    // For Refund TRN
    // this._RequestSequenceRefund =
    //   "Mid|TotalAmount|TxnRefNo|OrderNo|MeTransReqType|RefundAmount|RefundOrderNo";
    // this._ResponseSequenceRefund =
    //   "Mid|OrderNo|TxnRefNo|RefundAmount|CurrencyName|MeTransReqType|RespCode|RespMessage|TxnRespDate|RefundOrderNo|RefundTxnRefNo";
    // this._RefundAmount;
    // this._RefundOrderNo;
  }

  //#region Setter
  set mid(value) {
    this._mid = value;
  }

  set secretKey(value) {
    this._secretKey = value;
  }

  set saltKey(value) {
    this._saltKey = value;
  }

  set orderNo(value) {
    this._orderNo = value;
  }

  set amount(value) {
    this._amount = value || 0;
  }

  set currency(value) {
    this._currency = value || "";
  }

  set txnReqType(value) {
    this._txnReqType = value || "S";
  }

  set undefinedField1(value) {
    this._undefinedField1 = value;
  }

  set undefinedField2(value) {
    this._undefinedField2 = value;
  }

  set undefinedField3(value) {
    this._undefinedField3 = value;
  }

  set undefinedField4(value) {
    this._undefinedField4 = value;
  }

  set undefinedField5(value) {
    this._undefinedField5 = value;
  }

  set undefinedField6(value) {
    this._undefinedField6 = value;
  }

  set undefinedField7(value) {
    this._undefinedField7 = value;
  }

  set undefinedField8(value) {
    this._undefinedField8 = value;
  }

  set undefinedField9(value) {
    this._undefinedField9 = value;
  }

  set undefinedField10(value) {
    this._undefinedField10 = value;
  }

  set emailId(value) {
    this._emailId = value || "";
  }
  set mobileNo(value) {
    this._mobileNo = value || "";
  }

  set address(value) {
    this._address = value || "";
  }

  set city(value) {
    this._city = value || "";
  }

  set state(value) {
    this._state = value || "";
  }

  set pincode(value) {
    this._pincode = value || "";
  }

  set transactionMethod(value) {
    this._transactionMethod = value || "";
  }

  set bankCode(value) {
    this._bankCode = value || "";
  }

  set vpa(value) {
    this._vpa = value || "";
  }

  set cardNumber(value) {
    this._cardNumber = value || "";
  }

  set expiryDate(value) {
    this._expiryDate = value || "";
  }

  set cvv(value) {
    this._cvv = value || "";
  }

  set customerName(value) {
    this._customerName = value || "";
  }

  set respUrl(value) {
    this._respUrl = value;
  }

  set optional1(value) {
    this._optional1 = value || "";
  }

  // set TrnRefNo(value) {
  //   this._TrnRefNo = value || "null";
  // }
  // set TxnRefNo(value) {
  //   this._TxnRefNo = value || "";
  // }
  // set CancelAmount(value) {
  //   this._CancelAmount = value ? parseFloat(value) * 100 : "";
  // }
  // set CancelOrderNo(value) {
  //   this._CancelOrderNo = value || "";
  // }
  // set RefundAmount(value) {
  //   this._RefundAmount = value || "";
  // }
  // set RefundOrderNo(value) {
  //   this._RefundOrderNo = value || "";
  // }

  //#endregion End Setter

  //#region Getter
  get mid() {
    return this._mid;
  }

  get secretKey() {
    return this._secretKey;
  }

  get saltKey() {
    return this._saltKey;
  }

  get orderNo() {
    return this._orderNo;
  }

  get amount() {
    return this._amount ? parseFloat(this._amount) * 100 : 0;
  }

  get currency() {
    return this._currency;
  }

  get txnReqType() {
    return this._txnReqType;
  }

  get undefinedField1() {
    return this._undefinedField1;
  }

  get undefinedField2() {
    return this._undefinedField2;
  }

  get undefinedField3() {
    return this._undefinedField3;
  }

  get undefinedField4() {
    return this._undefinedField4;
  }

  get undefinedField5() {
    return this._undefinedField5;
  }

  get undefinedField6() {
    return this._undefinedField6;
  }

  get undefinedField7() {
    return this._undefinedField7;
  }

  get undefinedField8() {
    return this._undefinedField8;
  }

  get undefinedField9() {
    return this._undefinedField9;
  }

  get undefinedField10() {
    return this._undefinedField10;
  }

  get emailId() {
    return this._emailId;
  }

  get mobileNo() {
    return this._mobileNo;
  }

  get address() {
    return this._address;
  }

  get city() {
    return this._city;
  }

  get state() {
    return this._state;
  }

  get pincode() {
    return this._pincode;
  }

  get transactionMethod() {
    return this._transactionMethod;
  }

  get bankCode() {
    return this._bankCode;
  }

  get vpa() {
    return this._vpa;
  }

  get cardNumber() {
    return this._cardNumber;
  }

  get expiryDate() {
    return this._expiryDate;
  }

  get cvv() {
    return this._cvv;
  }

  get customerName() {
    return this._customerName;
  }

  get respUrl() {
    return this._respUrl;
  }

  get optional1() {
    return this._optional1;
  }

  get RequestSequence() {
    return this._RequestSequence;
  }

  get RequestSequenceStatus() {
    return this._RequestSequenceStatus;
  }

  get ResponseSequence() {
    return this._ResponseSequence;
  }

  get ResponseSequenceStatus() {
    return this._ResponseSequenceStatus;
  }

  get PGStatusCheck_URL() {
    return this._PGStatusCheck_URL;
  }

  // get RequestSequenceCancel() {
  //   return this._RequestSequenceCancel;
  // }

  // get RequestSequenceRefund() {
  //   return this._RequestSequenceRefund;
  // }

  //#endregion End Getter

  async initiatePayment({
    mid = "",
    secretKey = "",
    saltKey = "",
    orderNo = "",
    amount = "",
    currency = "",
    txnReqType = "",
    undefinedField1 = "",
    undefinedField2 = "",
    undefinedField3 = "",
    undefinedField4 = "",
    undefinedField5 = "",
    undefinedField6 = "",
    undefinedField7 = "",
    undefinedField8 = "",
    undefinedField9 = "",
    undefinedField10 = "",
    emailId = "",
    mobileNo = "",
    address = "",
    city = "",
    state = "",
    pincode = "",
    transactionMethod = "",
    bankCode = "",
    vpa = "",
    cardNumber = "",
    expiryDate = "",
    cvv = "",
    customerName = "",
    respUrl = "",
    optional1 = "",
  }) {
    let error = "";

    if (mid && mid?.trim() !== "") {
      this._mid = mid;
    } else {
      error = error + "Mid Field is required.\n";
    }

    if (secretKey && secretKey?.trim() !== "") {
      this._secretKey = secretKey;
    } else {
      error = error + "SecretKey Field is required.\n";
    }

    if (saltKey && saltKey?.trim() !== "") {
      this._saltKey = saltKey;
    } else {
      error = error + "SaltKey Field is required.\n";
    }

    if (orderNo && orderNo?.toString()?.trim() !== "") {
      this._orderNo = orderNo;
    } else {
      error = error + "OrderNo Field is required.\n";
    }

    if (amount && amount?.trim() !== "") {
      this._amount = amount;
    } else {
      error = error + "Total Amount Field is required.\n";
    }

    if (currency && currency?.trim() !== "") {
      this._currency = currency;
    } else {
      error = error + "Currency Field is required.\n";
    }

    if (txnReqType && txnReqType?.trim() !== "") {
      this._txnReqType = txnReqType;
    } else {
      error = error + "TxnReqType Field is required.\n";
    }

    this._undefinedField1 = undefinedField1;
    this._undefinedField2 = undefinedField2;
    this._undefinedField3 = undefinedField3;
    this._undefinedField4 = undefinedField4;
    this._undefinedField5 = undefinedField5;
    this._undefinedField6 = undefinedField6;
    this._undefinedField7 = undefinedField7;
    this._undefinedField8 = undefinedField8;
    this._undefinedField9 = undefinedField9;
    this._undefinedField10 = undefinedField10;

    if (emailId && emailId?.trim() !== "") {
      this._emailId = emailId;
    } else {
      error = error + "Email Id. Field is required.\n";
    }

    if (mobileNo && mobileNo?.trim() !== "") {
      this._mobileNo = mobileNo;
    } else {
      error = error + "Mobile No. Field is required.\n";
    }

    this._address = address;
    this._city = city;
    this._state = state;
    this._pincode = pincode;

    if (transactionMethod && transactionMethod?.trim() !== "") {
      this._transactionMethod = transactionMethod;
    } else {
      error = error + "Transaction Method Field is required.\n";
    }

    this._bankCode = bankCode;
    this._vpa = vpa;
    this._cardNumber = cardNumber;
    this._expiryDate = expiryDate;
    this._cvv = cvv;

    this._customerName = customerName;
    this._respUrl = respUrl;

    if (optional1 && optional1?.trim() !== "") {
      this._optional1 = optional1;
    } else {
      error = error + "UPIType Field is required.\n";
    }

    if (error && error?.trim() !== "") {
      return { error: error };
    } else {
      const res = await this.#doPayment();
      return res;
    }
  }

  async #doPayment() {
    const encryptReq = this.#getEncrypt("TrnPayment");
    const checkSum = this.#getCheckSum(this.saltKey, this.orderNo, this.amount, this.transactionMethod, this.bankCode, this.vpa, this.cardNumber, this.expiryDate, this.cvv);
    const mid = this.mid;
    let data = {
      mid: mid,
      encryptReq: encryptReq,
      checkSum: checkSum,
    };

    try {
      const res = await fetch(this._PG_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      let response = await res.text();
      return JSON.parse(response)
    } catch (error) {
      return { error: "Something went wrong!" };
    }
  }

  #getEncrypt(msg = "TrnPayment") {
    let hashVarsSeq = [];

    if (msg == "TrnPayment") {
      hashVarsSeq = this.RequestSequence.split("|");
    }

    if (msg == "TrnStatus") {
      hashVarsSeq = this.RequestSequenceStatus.split("|");
    }

    // if (msg == "TrnCancel") {
    //   hashVarsSeq = this.RequestSequenceCancel.split("|");
    // }

    // if (msg == "TrnRefund") {
    //   hashVarsSeq = this.RequestSequenceRefund.split("|");
    // }

    let hash_string = "";
    let i = 1;
    let count = hashVarsSeq.length;

    hashVarsSeq.forEach((hash_var) => {
      hash_string = hash_string + this[hash_var];
      if (i != count) hash_string += ",";
      i++;
    });

    return this.#encrypt(hash_string, this.secretKey);
  }

  #encrypt(hashString, key) {
    const iv = CryptoJS.lib.WordArray.create(16);
    key = this.#fixKey(key);
    key = this.#derivateKey(key, this._sp_salt_key, 65536, 256);
    const cipher = CryptoJS.AES.encrypt(hashString, key, {
      iv: iv,
      format: CryptoJS.format.OpenSSL,
    });
    return cipher.toString();
  }

  #decrypt(data, key) {
    const iv = CryptoJS.lib.WordArray.create(16);
    key = this.#fixKey(key);
    key = this.#derivateKey(key, this._sp_salt_key, 65536, 256);
    const decrypted = CryptoJS.AES.decrypt(data, key, {
      iv: iv,
      format: CryptoJS.format.OpenSSL,
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
  }

  #derivateKey(password, salt, iterations, keyLengthBits) {
    const key = CryptoJS.PBKDF2(password, salt, {
      keySize: keyLengthBits / 32,
      iterations: iterations,
      hasher: CryptoJS.algo.SHA256,
    });

    return key;
  }

  #fixKey(key) {
    if (key.length < this._key_len) {
      // 0 pad to length keyLength
      return key.padEnd(this._key_len, "0");
    }

    if (key.length > this._key_len) {
      // Truncate to keyLength characters
      return key.substring(0, this._key_len);
    }

    return key;
  }

  #getCheckSum(saltKey, orderNo, amount, transactionMethod, bankCode, vpa, cardNumber, expiryDate, cvv,) {
    const dataString = orderNo + "," + amount + "," + transactionMethod + "," + bankCode + "," + vpa + "," + cardNumber + "," + expiryDate + "," + cvv;
    saltKey = this.#base64Encode(saltKey);
    let hashValue = CryptoJS.HmacSHA512(dataString, saltKey);
    hashValue = CryptoJS.enc.Hex.stringify(hashValue);
    hashValue = hashValue.toString().toUpperCase();
    return hashValue;
  }

  #base64Encode(data) {
    return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(data));
  }

  getResponse(respData, mid, checkSum) {
    if (mid == this.mid) {
      let response = this.#decrypt(respData, this.secretKey);
      let respArray = response.split(",");
      let hashRespSeq = this.ResponseSequence.split("|");

      let i = 0;
      let returnArray = {};
      hashRespSeq.forEach((hash_var) => {
        returnArray[hash_var] = respArray[i];
        i++;
      });

      let CheckSumTxnResp = this.#createCheckSumTxnResp(this.saltKey, returnArray["orderNo"], returnArray["payAmount"], returnArray["respCode"], returnArray["respMessage"]);
      if (checkSum === CheckSumTxnResp) {
        let ResponseArray = {};
        ResponseArray["mid"] = returnArray["mid"];
        ResponseArray["orderNo"] = returnArray["orderNo"];
        ResponseArray["txnRefNo"] = returnArray["txnRefNo"];
        ResponseArray["amount"] = parseFloat(returnArray["amount"]) / 100;
        ResponseArray["currency"] = returnArray["currency"];
        ResponseArray["txnReqType"] = returnArray["txnReqType"];
        ResponseArray["undefinedField1"] = returnArray["undefinedField1"];
        ResponseArray["undefinedField2"] = returnArray["undefinedField2"];
        ResponseArray["undefinedField3"] = returnArray["undefinedField3"];
        ResponseArray["undefinedField4"] = returnArray["undefinedField4"];
        ResponseArray["undefinedField5"] = returnArray["undefinedField5"];
        ResponseArray["undefinedField6"] = returnArray["undefinedField6"];
        ResponseArray["undefinedField7"] = returnArray["undefinedField7"];
        ResponseArray["undefinedField8"] = returnArray["undefinedField8"];
        ResponseArray["undefinedField9"] = returnArray["undefinedField9"];
        ResponseArray["undefinedField10"] = returnArray["undefinedField10"];
        ResponseArray["emailId"] = returnArray["emailId"];
        ResponseArray["mobileNo"] = returnArray["mobileNo"];
        ResponseArray["address"] = returnArray["address"];
        ResponseArray["city"] = returnArray["city"];
        ResponseArray["state"] = returnArray["state"];
        ResponseArray["pincode"] = returnArray["pincode"];
        ResponseArray["respCode"] = returnArray["respCode"];
        ResponseArray["respMessage"] = returnArray["respMessage"];
        ResponseArray["payAmount"] = parseFloat(returnArray["payAmount"]) / 100;
        ResponseArray["txnRespDate"] = returnArray["txnRespDate"];
        ResponseArray["upiString"] = returnArray["upiString"];

        console.log(" SambhavPay.js:679 ~ SambhavPay ~ getResponse ~ ResponseArray:", ResponseArray);

        return JSON.stringify(ResponseArray, null, 2);
      } else {
        return "CheckSum Miss Match!";
      }
    }
  }

  #createCheckSumTxnResp(saltKey, orderNo, amount, respCode, respMessage) {
    const dataString = orderNo + "," + amount + "," + respCode + "," + respMessage;
    saltKey = this.#base64Encode(saltKey);
    let hashValue = CryptoJS.HmacSHA512(dataString, saltKey);
    hashValue = CryptoJS.enc.Hex.stringify(hashValue);
    hashValue = hashValue.toString().toUpperCase();
    return hashValue;
  }

  async getTrnStatus() {
    const encryptStatus = this.#getEncrypt("TrnStatus");
    const statusCheckSum = this.#getApiCheckSum(this.saltKey, this.orderNo);
    const mid = this.mid;

    let statusArr = {};
    statusArr["mid"] = mid;
    statusArr["encryptStatus"] = encryptStatus;
    statusArr["statusCheckSum"] = statusCheckSum;
    let queryString = Object.keys(statusArr)
      .map(
        (key) =>
          encodeURIComponent(key) + "=" + encodeURIComponent(statusArr[key])
      )
      .join("&");
    const url = this.PGStatusCheck_URL;
    const result = await this.#excuteSilentPost(url, queryString);
    
    return this.#parseStatusResp(result);
  }

  async #excuteSilentPost(url, param) {
    const result = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: param,
    });
    return result.text();
  }

  #parseStatusResp(data) {
    let ResponseArray = {};
    let returnArray = {};
    let response = JSON.parse(data);

    if (!response?.errorMsg) {
      const respData = response?.respData;
      const mid = response?.mid;
      const checkSum = response?.checkSum;

      if (mid == this.mid) {
        response = this.#decrypt(respData, this.secretKey);
        let respArray = response?.split(",");
        hashRespSeq = this.ResponseSequenceStatus?.split("|");

        const i = 0;
        hashRespSeq.forEach((hash_var) => {
          returnArray[hash_var] = respArray[i];
          i++;
        });

        const CheckSumStatusResp = this.#createCheckSumStatusResp(this.saltKey, returnArray["orderNo"], returnArray["payAmount"], returnArray["respCode"], returnArray["respMessage"]);
        if (checkSum == CheckSumStatusResp) {
          ResponseArray["mid"] = returnArray["mid"];
          ResponseArray["orderNo"] = returnArray["orderNo"];
          ResponseArray["TxnRefNo"] = returnArray["TxnRefNo"];
          ResponseArray["amount"] = parseFloat(returnArray["amount"]) / 100;
          ResponseArray["currency"] = returnArray["currency"];
          ResponseArray["txnReqType"] = returnArray["txnReqType"];
          ResponseArray["undefinedField1"] = returnArray["undefinedField1"];
          ResponseArray["undefinedField2"] = returnArray["undefinedField2"];
          ResponseArray["undefinedField3"] = returnArray["undefinedField3"];
          ResponseArray["undefinedField4"] = returnArray["undefinedField4"];
          ResponseArray["undefinedField5"] = returnArray["undefinedField5"];
          ResponseArray["undefinedField6"] = returnArray["undefinedField6"];
          ResponseArray["undefinedField7"] = returnArray["undefinedField7"];
          ResponseArray["undefinedField8"] = returnArray["undefinedField8"];
          ResponseArray["undefinedField9"] = returnArray["undefinedField9"];
          ResponseArray["undefinedField10"] = returnArray["undefinedField10"];
          ResponseArray["emailId"] = returnArray["emailId"];
          ResponseArray["mobileNo"] = returnArray["mobileNo"];
          ResponseArray["address"] = returnArray["address"];
          ResponseArray["city"] = returnArray["city"];
          ResponseArray["state"] = returnArray["state"];
          ResponseArray["pincode"] = returnArray["pincode"];
          ResponseArray["respCode"] = returnArray["respCode"];
          ResponseArray["respMessage"] = returnArray["respMessage"];
          ResponseArray["payAmount"] = parseFloat(returnArray["payAmount"]) / 100;
          ResponseArray["txnRespDate"] = returnArray["txnRespDate"];
          ResponseArray["upiString"] = returnArray["upiString"];
        } else {
          ResponseArray.Error = "CheckSum Miss Match!";
        }
      } else {
        ResponseArray.Error = "Mid Miss Match!";
      }
    } else {
      ResponseArray.Error = response.errorMsg;
    }

    return JSON.stringify(ResponseArray, null, 2);
  }

  #getApiCheckSum(saltKey, orderNo) {
    const dataString = orderNo;
    saltKey = this.#base64Encode(saltKey);
    let hashValue = CryptoJS.HmacSHA512(dataString, saltKey);
    hashValue = CryptoJS.enc.Hex.stringify(hashValue);
    hashValue = hashValue.toString().toUpperCase();
    return hashValue;
  }

  #createCheckSumStatusResp(saltKey, orderNo, amount, RespCode, RespMessage) {
    const dataString = orderNo + "," + amount + "," + RespCode + "," + RespMessage;
    saltKey = this.#base64Encode(saltKey);
    let hashValue = CryptoJS.HmacSHA512(dataString, saltKey);
    hashValue = CryptoJS.enc.Hex.stringify(hashValue);
    hashValue = hashValue.toString().toUpperCase();
    return hashValue;
  }

//   #createCheckSumCancelResp(saltKey, cancelOrderNo,
//     cancelAmount,
//     RespCode,
//     RespMessage
//   ) {
//     const dataString =
//       cancelOrderNo + "," + cancelAmount + "," + RespCode + "," + RespMessage;
//     saltKey = this.#base64Encode(saltKey);
//     let hashValue = CryptoJS.HmacSHA512(dataString, saltKey);
//     hashValue = CryptoJS.enc.Hex.stringify(hashValue);
//     hashValue = hashValue.toString().toUpperCase();
//     return hashValue;
//   }

//   #createCheckSumRefundResp(
//     saltKey,
//     RefundOrderNo,
//     RefundAmount,
//     RespCode,
//     RespMessage
//   ) {
//     const dataString =
//       RefundOrderNo + "," + RefundAmount + "," + RespCode + "," + RespMessage;
//     saltKey = this.#base64Encode(saltKey);
//     let hashValue = CryptoJS.HmacSHA512(dataString, saltKey);
//     hashValue = CryptoJS.enc.Hex.stringify(hashValue);
//     hashValue = hashValue.toString().toUpperCase();
//     return hashValue;
//   }

//   #checkSumValidation(saltKey, orderNo) {
//     const dataString = orderNo;
//     saltKey = this.#base64Encode(saltKey);
//     let hashValue = CryptoJS.HmacSHA512(dataString, saltKey);
//     hashValue = CryptoJS.enc.Hex.stringify(hashValue);
//     hashValue = hashValue.toString().toUpperCase();
//     return hashValue;
//   }
}

export default new SambhavPay();
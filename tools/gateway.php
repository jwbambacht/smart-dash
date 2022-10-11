<?php
	header('Content-Type: application/json');

	$dataArray = $_GET;
	$data = http_build_query($dataArray);
	$getUrl = "https://trustsmartcloud2.com/ics2000_api/gateway.php?".$data;

	$ch = curl_init();
	curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, FALSE);
	curl_setopt($ch, CURLOPT_FOLLOWLOCATION, TRUE);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
	curl_setopt($ch, CURLOPT_URL, $getUrl);
	curl_setopt($ch, CURLOPT_TIMEOUT, 80);

	$response = curl_exec($ch);

	if(curl_error($ch)){
		echo 'Request Error:' . curl_error($ch);
	}else{
		echo $response;
	}

	curl_close($ch);
?>

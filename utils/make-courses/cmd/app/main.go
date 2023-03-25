package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/xuri/excelize/v2"
)

// func MakeRequest(url string, ch chan<- string) {
// 	start := time.Now()
// 	resp, _ := http.Get(url)
// 	secs := time.Since(start).Seconds()
// 	body, _ := ioutil.ReadAll(resp.Body)
// 	ch <- fmt.Sprintf("%.2f elapsed with response length: %d %s", secs, len(body), url)
// }
// func main() {
// 	f, err := excelize.OpenFile("./internal/data/courses.xlsx")
// 	if err != nil {
// 		log.Panic(err)
// 		return
// 	}

// 	defer func() {
// 		if err := f.Close(); err != nil {
// 			fmt.Println(err)
// 		}
// 	}()
// 	rows, err := f.GetRows("Table 1")
// 	if err != nil {
// 		fmt.Println(err)
// 		return
// 	}
// 	start := time.Now()
// 	ch := make(chan string)
// 	for _, row := range rows {
// 		go MakeRequest("https://coursehubiitg.in/api/search/"+row[0], ch)
// 	}
// 	for range rows {
// 		fmt.Println(<-ch)
// 	}
// 	fmt.Printf("%.2fs elapsed\n", time.Since(start).Seconds())
// }

func main() {
	f, err := excelize.OpenFile("./internal/data/courses.xlsx")
	if err != nil {
		log.Panic(err)
		return
	}

	defer func() {
		if err := f.Close(); err != nil {
			fmt.Println(err)
		}
	}()
	rows, err := f.GetRows("Table 1")
	if err != nil {
		fmt.Println(err)
		return
	}
	for _, row := range rows {
		postBody, _ := json.Marshal(map[string]string{
			"code": row[0],
			"name": row[1],
		})
		parsed := bytes.NewBuffer(postBody)
		resp, err := http.Post("http://localhost:8080/api/search/feed", "application/json", parsed)
		if err != nil {
			log.Fatal(err)
		}
		defer resp.Body.Close()
		fmt.Println("Created", row[0], row[1])
		time.Sleep(time.Millisecond * 50)
	}
}

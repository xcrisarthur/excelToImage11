"use client";

import React, { useCallback, useState, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import DataTable from "react-data-table-component";
import html2canvas from "html2canvas";

const Upload = () => {
	const [data, setData] = useState([]);
	const [columns, setColumns] = useState([]);
	const [pngPreview, setPngPreview] = useState(null);
	const [stickerNames, setStickerNames] = useState([]);
	const [loading, setLoading] = useState(false);
	const [fileName, setFileName] = useState("");
	const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

	const [summaryText, setSummaryText] = useState([]);
	const [size108Count, setSize108Count] = useState(0);
	const [size48Count, setSize48Count] = useState(0);
	const [size32Count, setSize32Count] = useState(0);

	// State to dynamically manage canvas refs
	const [canvasRefs, setCanvasRefs] = useState([]);

	const onDrop = useCallback((acceptedFiles) => {
		const file = acceptedFiles[0];
		setFileName(file.name);
		const reader = new FileReader();

		reader.onload = (event) => {
			try {
				const binaryStr = event.target.result;
				const workbook = XLSX.read(binaryStr, { type: "binary" });
				const sheetName = workbook.SheetNames[0];
				const sheet = workbook.Sheets[sheetName];
				const jsonData = XLSX.utils.sheet_to_json(sheet);

				if (jsonData.length > 0) {
					const keys = Object.keys(jsonData[0]);
					const cols = keys.map((key) => ({
						name: key,
						selector: (row) => row[key],
						sortable: true,
					}));
					setColumns(cols);
					setData(jsonData);

					const stickerNames = jsonData.map((row) => row["sticker name"]);
					setStickerNames(stickerNames);

					generateSummaryText(jsonData);
				}
			} catch (error) {
				console.error("Error parsing file:", error);
			}
		};

		reader.readAsBinaryString(file);
	}, []);

	const generateSummaryText = (jsonData) => {
		if (jsonData.length > 0) {
			const groupedData = jsonData.reduce((acc, row) => {
				const orderNumber = row["order number"];
				if (!acc[orderNumber]) {
					acc[orderNumber] = [];
				}
				acc[orderNumber].push(row);
				return acc;
			}, {});

			const summaries = Object.entries(groupedData).map(
				([orderNumber, rows], index) => {
					const buyerName = rows[0]["buyer name"];
					const type = rows[0]["type"];
					const size = rows[0]["size"];

					return `
            Data Image ${
							index + 1
						} / Buyer Name = ${buyerName} / Type = ${type} / Size = ${size} / Order Number = ${orderNumber}
          `.trim();
				}
			);

			setSummaryText(summaries);

			const countSize108 = summaries.filter((summary) =>
				summary.includes("Size = 108")
			).length;
			const countSize48 = summaries.filter((summary) =>
				summary.includes("Size = 48")
			).length;
			const countSize32 = summaries.filter((summary) =>
				summary.includes("Size = 32")
			).length;
			setSize108Count(countSize108);
			setSize48Count(countSize48);
			setSize32Count(countSize32);

			// Create canvas elements for each summary
			const newCanvasRefs = Array.from({ length: summaries.length }, () =>
				React.createRef()
			);
			setCanvasRefs(newCanvasRefs);
		}
	};

	const { getRootProps, getInputProps } = useDropzone({
		onDrop,
		accept: ".xlsx, .xls",
	});

	useEffect(() => {
		if (summaryText.length > 0) {
			const imgPaperA3Plus = new Image();
			imgPaperA3Plus.src = "/paperA3+.png";

			imgPaperA3Plus.onload = () => {
				setImageSize({
					width: imgPaperA3Plus.width,
					height: imgPaperA3Plus.height,
				});

				canvasRefs.forEach((canvasRef, index) => {
					const canvas = canvasRef.current;
					if (canvas) {
						// Ensure canvas is not null
						const ctx = canvas.getContext("2d");
						const isLandscape = summaryText[index].includes("Size = 108");
						const isLandscape32 = summaryText[index].includes("Size = 32");
						const isLandscape24 = summaryText[index].includes("Size = 24");
						const isSize32 = summaryText[index].includes("Size = 32");

						// Rotate canvas to landscape if size is 108
						if (isLandscape || isLandscape32 || isLandscape24) {
							canvas.width = imgPaperA3Plus.height;
							canvas.height = imgPaperA3Plus.width;
							// Rotate the context to landscape
							ctx.save();
							ctx.translate(canvas.width / 2, canvas.height / 2);
							ctx.rotate((90 * Math.PI) / 180); // Rotate 90 degrees
							ctx.drawImage(
								imgPaperA3Plus,
								-imgPaperA3Plus.width / 2,
								-imgPaperA3Plus.height / 2
							);
							ctx.restore();
						} else {
							canvas.width = imgPaperA3Plus.width;
							canvas.height = imgPaperA3Plus.height;
							// No rotation needed for portrait mode
							ctx.drawImage(imgPaperA3Plus, 0, 0);
						}

						// Draw summary text on each canvas
						const textLines = summaryText[index].split("\n");
						ctx.fillStyle = "black";
						ctx.font = "20px Arial";
						textLines.forEach((line, i) => {
							ctx.fillText(line, 50, 50 + i * 30); // Adjust the y-coordinate for each line
						});

						const radius = 80;

						// Draw black circles
						ctx.beginPath();
						ctx.arc(radius * 2, radius * 2, radius, 0, 2 * Math.PI);
						ctx.fill();

						ctx.beginPath();
						ctx.arc(
							canvas.width - radius * 2,
							radius * 2,
							radius,
							0,
							2 * Math.PI
						);
						ctx.fill();

						ctx.beginPath();
						ctx.arc(
							radius * 2,
							canvas.height - radius * 2,
							radius,
							0,
							2 * Math.PI
						);
						ctx.fill();

						ctx.beginPath();
						ctx.arc(
							canvas.width - radius * 2,
							canvas.height - radius * 2,
							radius,
							0,
							2 * Math.PI
						);
						ctx.fill();

						// Draw the rectangular border
						var padding = 230; // Default padding

						if (isLandscape) {
							padding = 100; // Reduced padding for landscape
						} else if (isSize32) {
							padding = 0; // Set padding to 0 if size is 32
						} else if (isLandscape24) {
							padding = 80; // Set padding to 0 if size is 32
						} else {
							padding = 230; // Default padding for other cases
						}

						ctx.strokeStyle = "black";
						ctx.lineWidth = 5;
						const rectX = padding;
						const rectY = padding;
						const rectWidth = canvas.width - 2 * padding;
						const rectHeight = canvas.height - 2 * padding;
						ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);

						// Calculate table dimensions first

						// size 48
						var tablePadding = 230; //230
						// size 48

						if (isLandscape32) {
							tablePadding = 290; // Reduced padding for landscape
						} else {
							tablePadding = 210; // Default padding for other cases
						}

						let tableWidth = rectWidth - 2 * tablePadding;
						let tableHeight = rectHeight - 2.5 * tablePadding;

						// Check if it's "Size = 108" to adjust table height
						if (isLandscape) {
							tableHeight = rectHeight - 0.5 * 100; // Adjust height for "Size = 108"
						} else if (isLandscape32) {
							tableWidth = rectWidth - 2.5 * tablePadding;
							tableHeight = rectHeight - 2 * tablePadding;
						} else if (isLandscape24) {
							tableWidth = rectWidth - 2.7 * tablePadding;
							tableHeight = rectHeight - 2.5 * tablePadding;
						}

						const cellWidth = tableWidth / 2;
						const cellHeight = tableHeight / 2;

						// Now, calculate the centered position of the table
						const tableX = rectX + (rectWidth - tableWidth) / 2;
						const tableY = rectY + (rectHeight - tableHeight) / 2;

						// Draw the 2x2 table
						ctx.beginPath();
						ctx.moveTo(tableX, tableY + cellHeight);
						ctx.lineTo(tableX + tableWidth, tableY + cellHeight);
						ctx.stroke();

						ctx.beginPath();
						ctx.moveTo(tableX + cellWidth, tableY);
						ctx.lineTo(tableX + cellWidth, tableY + tableHeight);
						ctx.stroke();

						ctx.strokeRect(tableX, tableY, tableWidth, tableHeight);

						function drawRoundedRect(ctx, x, y, width, height, radius) {
							ctx.beginPath();
							ctx.moveTo(x + radius, y);
							ctx.lineTo(x + width - radius, y);
							ctx.arcTo(x + width, y, x + width, y + radius, radius);
							ctx.lineTo(x + width, y + height - radius);
							ctx.arcTo(
								x + width,
								y + height,
								x + width - radius,
								y + height,
								radius
							);
							ctx.lineTo(x + radius, y + height);
							ctx.arcTo(x, y + height, x, y + height - radius, radius);
							ctx.lineTo(x, y + radius);
							ctx.arcTo(x, y, x + radius, y, radius);
							ctx.closePath();
						}

						function fitText(ctx, text, boxWidth, boxHeight, maxFontSize) {
							let fontSize = maxFontSize;
							do {
								ctx.font = `${fontSize}px Arial`;
								fontSize -= 1;
							} while (ctx.measureText(text).width > boxWidth && fontSize > 0);
							return fontSize;
						}

						const drawNestedTable = (
							x,
							y,
							width,
							height,
							stickerName,
							colors,
							sizeText
						) => {
							let innerCols = 3;
							let innerRows;

							const boxRadius = 30;

							// Determine the table size based on the sizeText
							if (sizeText.includes("Size = 108")) {
								innerCols = 6;
								innerRows = 18;
							} else if (sizeText.includes("Size = 32")) {
								innerCols = 4;
								innerRows = 8; // Change to 3x11 for Size = 32
							} else if (sizeText.includes("Size = 24")) {
								innerCols = 4;
								innerRows = 6; // Change to 3x11 for Size = 32
							} else {
								innerRows = 16;
							}

							let boxWidth, boxHeight;

							// size 48
							const boxMargin = 30;
							// size 48

							// Determine the box size based on the sizeText
							if (sizeText.includes("Size = 108")) {
								boxWidth = 389.8;
								boxHeight = 70.9;
							} else if (sizeText.includes("Size = 48")) {
								boxWidth = 472.4;
								boxHeight = 118.11;
							} else if (sizeText.includes("Size = 32")) {
								boxWidth = 590.5;
								boxHeight = 177.2;
							} else if (sizeText.includes("Size = 24")) {
								boxWidth = 590.5;
								boxHeight = 236.2;
							} else {
								// Default size
								boxWidth = 472.4;
								boxHeight = 118.11;
							}

							for (let row = 0; row < innerRows; row++) {
								for (let col = 0; col < innerCols; col++) {
									// Add margin to the box positions
									const boxX = x + col * (boxWidth + boxMargin) + boxMargin / 2;
									const boxY =
										y + row * (boxHeight + boxMargin) + boxMargin / 2;

									// Use the colors array based on row index to achieve vertical coloring
									const color = colors[row % colors.length]; // Cycle through colors based on the row
									ctx.fillStyle = color; // Set the color dynamically based on the row

									drawRoundedRect(
										ctx,
										boxX,
										boxY,
										boxWidth,
										boxHeight,
										boxRadius
									);
									ctx.fill();

									ctx.strokeStyle = "black";
									ctx.lineWidth = 1;
									ctx.stroke();

									// Check for Size = 24 and customize the text filling
									if (sizeText.includes("Size = 24")) {
										// Set text color based on background color
										let textColor;
										switch (color) {
											case "#FF0000":
												textColor = "white";
												break;
											case "#0800FF":
												textColor = "white";
												break;
											case "#000000":
												textColor = "white";
												break;
											case "#FF00EE":
												textColor = "white";
												break;
											case "#F3F704":
												textColor = "black";
												break;
											case "#11FF00":
												textColor = "black";
												break;
											case "#FFFFFF":
												textColor = "black";
												break;
											case "#0095FF":
												textColor = "black";
												break;
											default:
												textColor = "black"; // Default color for other backgrounds
										}

										ctx.fillStyle = textColor;
										
										ctx.textAlign = "left"; // Align text to the left
										ctx.textBaseline = "middle";

										// Define the margin from the left edge of the box
										const textMargin = 20;
										const fontSize = fitText(
											ctx,
											stickerName,
											boxWidth - 50,
											boxHeight,
											50
										);

										ctx.font = `${fontSize}px Arial`;
										// Sticker name at the top
										ctx.fillText(
											stickerName,
											boxX + textMargin, // Position the text with a margin from the left
											boxY + boxHeight / 4
										);

										// Class and Subject lines
										ctx.font = "40px Arial";
										const classText = "Class    : _________________";
										const subjectText = "Subject : _________________";
										ctx.fillText(
											classText,
											boxX + textMargin, // Position the text with a margin from the left
											boxY + boxHeight / 2
										);
										ctx.fillText(
											subjectText,
											boxX + textMargin, // Position the text with a margin from the left
											boxY + (3 * boxHeight) / 4
										);
									} else {
										// Default text rendering
										const fontSize = fitText(
											ctx,
											stickerName,
											boxWidth - 50,
											boxHeight,
											70
										);

										ctx.font = `${fontSize}px Arial`;

										// Set text color based on background color
										let textColor;
										switch (color) {
											case "#FF0000":
												textColor = "white";
												break;
											case "#0800FF":
												textColor = "white";
												break;
											case "#000000":
												textColor = "white";
												break;
											case "#FF00EE":
												textColor = "white";
												break;
											case "#F3F704":
												textColor = "black";
												break;
											case "#11FF00":
												textColor = "black";
												break;
											case "#FFFFFF":
												textColor = "black";
												break;
											case "#0095FF":
												textColor = "black";
												break;
											default:
												textColor = "black"; // Default color for other backgrounds
										}

										ctx.fillStyle = textColor;
										ctx.textAlign = "center";
										ctx.textBaseline = "middle";

										ctx.fillText(
											stickerName,
											boxX + boxWidth / 2,
											boxY + boxHeight / 2
										);
									}
								}
							}
						};

						const drawOuterTable = (
							x,
							y,
							width,
							height,
							stickers,
							sizeText
						) => {
							const positions = [
								{ x: x, y: y }, // Top-left
								{ x: x, y: y + height }, // Bottom-left
								{ x: x + width, y: y }, // Top-right
								{ x: x + width, y: y + height }, // Bottom-right
							];

							const nestedTableWidth = width - 20;
							const nestedTableHeight = height - 20;

							// Define the colors for each quadrant
							const colorSets = [
								[
									"#FF0000",
									"#0800FF",
									"#F3F704",
									"#11FF00",
									"#000000",
									"#FFFFFF",
									"#0095FF",
									"#FF00EE",
								],
								["#008000", "#32CD32", "#90EE90"],
								["#FFD700", "#FFFF00", "#FFA500"],
								["#0000FF", "#1E90FF", "#87CEFA"],
							];

							stickers.forEach((stickerName, i) => {
								const pos = positions[i];
								const colors = colorSets[i % colorSets.length]; // Use color sets per quadrant
								drawNestedTable(
									pos.x + 10,
									pos.y + 10,
									nestedTableWidth,
									nestedTableHeight,
									stickerName,
									colors,
									sizeText
								);
							});
						};

						// Extract size text from the summaryText
						const sizeText = summaryText[index];

						const stickersForCanvas = stickerNames.slice(
							index * 4,
							index * 4 + 4
						);

						drawOuterTable(
							tableX,
							tableY,
							cellWidth,
							cellHeight,
							stickersForCanvas,
							sizeText
						);
					}
				});
			};
		}
	}, [canvasRefs, summaryText]);

	const generatePNG = async () => {
		setLoading(true);
		try {
			const element = document.querySelector(".convertToPNG");
			const canvas = await html2canvas(element, {
				useCORS: true,
			});

			const imgData = canvas.toDataURL("image/png");

			setPngPreview(imgData);
		} catch (error) {
			console.error("Error generating PNG:", error);
		} finally {
			setLoading(false);
		}
	};

	const saveEditedPNG = () => {
		const canvas = canvasRefs[0]?.current; // Ensure the canvas is available
		if (canvas) {
			const imgData = canvas.toDataURL("image/png");
			setPngPreview(imgData);
		}
	};

	return (
		<div style={{ padding: "20px" }}>
			<div {...getRootProps({ style: styles.dropzone })}>
				<input {...getInputProps()} />
				<p>Drag & drop a file here, or click to select a file</p>
			</div>
			{data.length > 0 && (
				<>
					<h2 style={{ marginTop: "20px", marginBottom: "20px" }}>
						{`Uploaded File: ${fileName}`}
					</h2>
					<DataTable
						columns={columns}
						data={data}
						pagination
						highlightOnHover
						striped
					/>

					<button
						style={styles.button}
						onClick={generatePNG}
						disabled={loading}>
						{loading ? "Generating..." : "Generate"}
					</button>
				</>
			)}
			{summaryText.length > 0 && (
				<div style={{ marginTop: "20px" }}>
					<h3>Data Summary:</h3>
					{summaryText.map((text, index) => (
						<p key={index}>{text}</p>
					))}
					<p>
						<strong>Total images with size 108: {size108Count}</strong>
					</p>
					<p>
						<strong>Total images with size 48: {size48Count}</strong>
					</p>
					<p>
						<strong>Total images with size 32: {size32Count}</strong>
					</p>
				</div>
			)}
			<div style={{ marginBottom: "20px" }}>
				<h2>A3+ Image Display and Editing</h2>
				<p>
					<strong>Image Size:</strong> {imageSize.width} x {imageSize.height}{" "}
					pixels
				</p>

				<div id="listCanvas">
					{canvasRefs.map((canvasRef, index) => (
						<canvas
							ref={canvasRef}
							key={index}
							style={{ border: "1px solid #000", margin: "10px 0" }}></canvas>
					))}
				</div>

				<button style={styles.button} onClick={saveEditedPNG}>
					Save Edited Image
				</button>
			</div>

			{pngPreview && (
				<div style={{ marginTop: "20px" }}>
					<h3>Preview:</h3>
					<img
						src={pngPreview}
						style={{
							width: "100%",
							maxWidth: "3885px",
							border: "1px solid #000",
						}}
						alt="Preview"
					/>
					<a
						href={pngPreview}
						download="a3_plus_image.png"
						style={styles.button}>
						Download
					</a>
				</div>
			)}
		</div>
	);
};

const styles = {
	dropzone: {
		border: "2px dashed #cccccc",
		borderRadius: "10px",
		padding: "20px",
		textAlign: "center",
		cursor: "pointer",
		marginBottom: "20px",
	},
	button: {
		marginTop: "20px",
		padding: "10px 20px",
		backgroundColor: "#007bff",
		color: "#ffffff",
		border: "none",
		borderRadius: "5px",
		cursor: "pointer",
		textDecoration: "none",
		display: "inline-block",
	},
};

export default Upload;
